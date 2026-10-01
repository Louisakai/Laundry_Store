import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, Role } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getOrders(params: {
    status?: OrderStatus;
    orderType?: string;
    workZone?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.orderType) where.orderType = params.orderType;
    if (params.workZone) where.workZone = params.workZone;
    if (params.fromDate || params.toDate) {
      where.created_at = {};
      if (params.fromDate) where.created_at.gte = new Date(params.fromDate);
      if (params.toDate) where.created_at.lte = new Date(params.toDate);
    }
    if (params.search) {
      where.customer = {
        OR: [
          { fullName: { contains: params.search } },
          { phone: { contains: params.search } },
        ],
      };
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, fullName: true, phone: true, email: true },
          },
          staff: {
            select: { id: true, fullName: true, staffType: true },
          },
          orderItems: { include: { service: true } },
          pickupAddress: true,
          deliveryAddress: true,
          trackingLogs: { orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 1 },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrdersToday, ordersByStatus, onlineStaff, unassignedOrders] =
      await Promise.all([
        this.prisma.order.count({
          where: { created_at: { gte: today } },
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.user.count({
          where: {
            role: Role.STAFF,
            isAvailable: true,
          },
        }),
        this.prisma.order.count({
          where: {
            staff_id: null,
            status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
          },
        }),
      ]);

    const ordersByStatusMap: Record<string, number> = {};
    ordersByStatus.forEach((item) => {
      ordersByStatusMap[item.status] = item._count.id;
    });

    return {
      totalOrdersToday,
      ordersByStatus: ordersByStatusMap,
      onlineStaff,
      unassignedOrders,
    };
  }

  async getRevenue(fromDate?: string, toDate?: string) {
    const where: any = {
      paymentStatus: 'SUCCESS',
    };
    if (fromDate || toDate) {
      where.updated_at = {};
      if (fromDate) where.updated_at.gte = new Date(fromDate);
      if (toDate) where.updated_at.lte = new Date(toDate);
    }

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        totalPrice: true,
        paymentMethod: true,
        updated_at: true,
      },
      orderBy: { updated_at: 'desc' },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);

    return {
      totalRevenue,
      orderCount: orders.length,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    };
  }

  async getAnalyticsOrders(fromDate?: string, toDate?: string) {
    const where: any = {};
    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) where.created_at.gte = new Date(fromDate);
      if (toDate) where.created_at.lte = new Date(toDate);
    }

    const [byStatus, byWorkZone, byOrderType, completedCount] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        where,
      }),
      this.prisma.order.groupBy({
        by: ['orderType'],
        _count: { id: true },
        where,
      }),
      this.prisma.order.groupBy({
        by: ['orderType'],
        _count: { id: true },
        where,
      }),
      this.prisma.order.count({
        where: { ...where, status: OrderStatus.DELIVERED },
      }),
    ]);

    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byOrderType: byOrderType.map((t) => ({
        type: t.orderType,
        count: t._count.id,
      })),
      totalOrders: byOrderType.reduce((sum, t) => sum + t._count.id, 0),
      completedOrders: completedCount,
    };
  }

  async getStaffAnalytics() {
    const staff = await this.prisma.user.findMany({
      where: { role: Role.STAFF },
      select: {
        id: true,
        fullName: true,
        staffType: true,
        isAvailable: true,
        ordersAsStaff: {
          select: {
            id: true,
            status: true,
            totalPrice: true,
            created_at: true,
          },
          where: {
            status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
          },
        },
      },
    });

    const reviews = await this.prisma.review.groupBy({
      by: ['staff_id'],
      _avg: { shipperRating: true, serviceRating: true },
    });

    const reviewMap = new Map(
      reviews.map((r) => [r.staff_id, { shipperRating: r._avg.shipperRating, serviceRating: r._avg.serviceRating }]),
    );

    return staff.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      staffType: s.staffType,
      isAvailable: s.isAvailable,
      completedOrders: s.ordersAsStaff.length,
      totalRevenue: s.ordersAsStaff.reduce((sum, o) => sum + o.totalPrice, 0),
      avgRating: reviewMap.get(s.id)?.serviceRating ?? null,
      avgShipperRating: reviewMap.get(s.id)?.shipperRating ?? null,
    }));
  }

  async getDailyRevenue(days?: number, fromDate?: string, toDate?: string) {
    const endDate = toDate ? new Date(toDate) : new Date();
    const startDate = fromDate ? new Date(fromDate) : new Date();
    if (!fromDate) {
      startDate.setDate(startDate.getDate() - (days ?? 30));
      startDate.setHours(0, 0, 0, 0);
    }

    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'SUCCESS',
        updated_at: { gte: startDate, lte: endDate },
      },
      select: { totalPrice: true, updated_at: true },
      orderBy: { updated_at: 'asc' },
    });

    const totalDays = fromDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) : (days ?? 30);
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }

    for (const o of orders) {
      const key = o.updated_at.toISOString().slice(0, 10);
      if (dailyMap[key] !== undefined) dailyMap[key] += o.totalPrice;
    }

    return Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue }));
  }

  async getServiceAnalytics() {
    const services = await this.prisma.service.findMany({
      where: { isActive: true },
      include: {
        orderItems: {
          where: {
            order: { status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] } },
          },
          select: { quantity: true, subtotal: true },
        },
      },
    });

    const sorted = services
      .map((s) => {
        const orderCount = s.orderItems.length;
        const totalQuantity = s.orderItems.reduce((sum, oi) => sum + (oi.quantity ?? 0), 0);
        const totalRevenue = s.orderItems.reduce((sum, oi) => sum + (oi.subtotal ?? 0), 0);
        return {
          id: s.id,
          name: s.name,
          unit: s.unit,
          orderCount,
          totalQuantity,
          totalRevenue,
        };
      })
      .sort((a, b) => b.orderCount - a.orderCount);

    return sorted;
  }

  async getServiceReviews() {
    const reviews = await this.prisma.review.findMany({
      where: { serviceComment: { not: null } },
      orderBy: { created_at: 'desc' },
      take: 20,
      select: {
        id: true,
        serviceRating: true,
        serviceComment: true,
        created_at: true,
        customer: { select: { fullName: true } },
        order: { select: { id: true } },
      },
    });

    return reviews;
  }

  async updateOrderServices(orderId: string, items: { orderItemId: string; quantity: number }[]) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    return this.prisma.$transaction(async (tx) => {
      let totalPrice = 0;

      for (const item of items) {
        const orderItem = await tx.orderItem.findUnique({
          where: { id: item.orderItemId },
        });
        if (!orderItem) throw new NotFoundException(`OrderItem ${item.orderItemId} không tồn tại`);

        const subtotal = item.quantity * orderItem.price;
        totalPrice += subtotal;

        await tx.orderItem.update({
          where: { id: item.orderItemId },
          data: { quantity: item.quantity, subtotal },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { totalPrice },
      });

      return { success: true, totalPrice };
    });
  }

  async updateOrderPrice(orderId: string, totalPrice: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    if (totalPrice < 0) throw new BadRequestException('Giá không thể âm');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { totalPrice },
    });
  }
}
