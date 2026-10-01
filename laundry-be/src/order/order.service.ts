import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentService } from '../payment/payment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { WeighOrderDto } from './dto/weigh-order.dto';
import {
  OrderStatus,
  OrderType,
  StaffType,
  Role,
  PaymentStatus,
} from '@prisma/client';

const STORE_LAT = parseFloat(process.env.STORE_LAT || '10.03');
const STORE_LNG = parseFloat(process.env.STORE_LNG || '105.77');

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.CONFIRMED,
    OrderStatus.RECEIVED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.PICKING_UP,
    OrderStatus.RECEIVED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PICKING_UP]: [OrderStatus.RECEIVED],
  [OrderStatus.RECEIVED]: [OrderStatus.PROCESSING],
  [OrderStatus.PROCESSING]: [OrderStatus.COMPLETED, OrderStatus.DELIVERING],
  [OrderStatus.COMPLETED]: [OrderStatus.DELIVERING, OrderStatus.DELIVERED],
  [OrderStatus.DELIVERING]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

const ORDER_TYPE_FLOWS: Record<OrderType, OrderStatus[]> = {
  [OrderType.ONLINE]: [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PICKING_UP,
    OrderStatus.RECEIVED,
    OrderStatus.PROCESSING,
    OrderStatus.COMPLETED,
    OrderStatus.DELIVERING,
    OrderStatus.DELIVERED,
  ],
  [OrderType.WALKIN]: [
    OrderStatus.PENDING,
    OrderStatus.RECEIVED,
    OrderStatus.PROCESSING,
    OrderStatus.COMPLETED,
    OrderStatus.DELIVERED,
  ],
  [OrderType.DROP_OFF]: [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.RECEIVED,
    OrderStatus.PROCESSING,
    OrderStatus.COMPLETED,
    OrderStatus.DELIVERING,
    OrderStatus.DELIVERED,
  ],
};

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private paymentService: PaymentService,
  ) {}

  async findAll(userId: string, role: string, staffType?: string | null) {
    const where: Record<string, unknown> = {};
    if (role === 'CUSTOMER') {
      where.customer_id = userId;
    } else if (role === 'STAFF' && staffType === 'SHIPPER') {
      where.staff_id = userId;
      where.status = {
        in: [
          OrderStatus.CONFIRMED,
          OrderStatus.PICKING_UP,
          OrderStatus.RECEIVED,
          OrderStatus.DELIVERING,
        ],
      };
    }
    return this.prisma.order.findMany({
      where,
      include: {
        orderItems: { include: { service: true } },
        customer: {
          select: { id: true, fullName: true, phone: true },
        },
        pickupAddress: true,
        deliveryAddress: true,
        trackingLogs: { orderBy: [{ created_at: 'desc' }, { id: 'desc' }] },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: { include: { service: true } },
        pickupAddress: true,
        deliveryAddress: true,
        trackingLogs: { orderBy: [{ created_at: 'desc' }, { id: 'desc' }] },
        customer: true,
        staff: true,
      },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (role === 'CUSTOMER' && order.customer_id !== userId) {
      throw new ForbiddenException();
    }
    return order;
  }

  async create(userId: string, dto: CreateOrderDto) {
    if (dto.orderType === OrderType.ONLINE) {
      if (!dto.pickupAddressId || !dto.deliveryAddressId) {
        throw new BadRequestException(
          'Đơn ONLINE cần pickupAddressId và deliveryAddressId',
        );
      }
      if (!dto.deliveryWindowStart || !dto.deliveryWindowEnd) {
        throw new BadRequestException(
          'Đơn ONLINE cần deliveryWindowStart và deliveryWindowEnd',
        );
      }
      if (!dto.pickupWindowStart || !dto.pickupWindowEnd) {
        throw new BadRequestException(
          'Đơn ONLINE cần pickupWindowStart và pickupWindowEnd',
        );
      }
    }
    if (dto.orderType === OrderType.DROP_OFF) {
      if (!dto.deliveryAddressId) {
        throw new BadRequestException(
          'Đơn DROP_OFF cần deliveryAddressId (giao tận nhà)',
        );
      }
      if (!dto.deliveryWindowStart || !dto.deliveryWindowEnd) {
        throw new BadRequestException(
          'Đơn DROP_OFF cần deliveryWindowStart và deliveryWindowEnd',
        );
      }
    }

    if (
      dto.pickupWindowStart &&
      dto.pickupWindowEnd &&
      dto.deliveryWindowStart &&
      dto.deliveryWindowEnd
    ) {
      const pickupEnd = new Date(dto.pickupWindowEnd).getTime();
      const deliveryStart = new Date(dto.deliveryWindowStart).getTime();
      const deliveryEnd = new Date(dto.deliveryWindowEnd).getTime();

      if (deliveryStart <= pickupEnd) {
        throw new BadRequestException(
          'Thời gian giao đồ phải sau thời gian lấy đồ',
        );
      }

      const sixHours = 6 * 60 * 60 * 1000;
      if (deliveryStart - pickupEnd < sixHours) {
        throw new BadRequestException(
          'Khoảng cách giữa lấy và giao tối thiểu 6 tiếng',
        );
      }

      const d = new Date(deliveryEnd);
      const vietnamMinutes = d.getUTCHours() * 60 + d.getUTCMinutes() + 7 * 60;
      if (vietnamMinutes > 22 * 60) {
        throw new BadRequestException('Khung giờ giao đồ không được sau 22:00');
      }
    }

    const now = Date.now();
    const buffer = 5 * 60 * 1000;
    const timeFields = [
      { value: dto.pickupWindowStart, name: 'Thời gian lấy đồ' },
      { value: dto.pickupWindowEnd, name: 'Thời gian lấy đồ' },
      { value: dto.deliveryWindowStart, name: 'Thời gian giao đồ' },
      { value: dto.deliveryWindowEnd, name: 'Thời gian giao đồ' },
    ];
    for (const field of timeFields) {
      if (field.value && new Date(field.value).getTime() < now - buffer) {
        throw new BadRequestException(`${field.name} không thể ở quá khứ`);
      }
    }

    const serviceIds = dto.items.map((i) => i.serviceId);
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds }, isActive: true },
    });

    if (services.length !== serviceIds.length) {
      throw new BadRequestException(
        'Một số dịch vụ không tồn tại hoặc đã ngừng hoạt động',
      );
    }

    const serviceMap = new Map(services.map((s) => [s.id, s]));
    let totalPrice = 0;

    let staffId: string | null = null;
    if (
      dto.orderType === OrderType.WALKIN ||
      dto.orderType === OrderType.DROP_OFF
    ) {
      const creator = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (
        creator?.role === Role.STAFF &&
        creator.staffType === StaffType.WASHER
      ) {
        staffId = userId;
      }
    }
    if (!staffId) {
      const availableWasher = await this.prisma.user.findFirst({
        where: {
          role: Role.STAFF,
          staffType: StaffType.WASHER,
          isAvailable: true,
        },
        orderBy: { locationUpdatedAt: { sort: 'desc', nulls: 'last' } },
      });
      if (availableWasher) {
        staffId = availableWasher.id;
      }
    }

    const orderItemsData = dto.items.map((item) => {
      const service = serviceMap.get(item.serviceId)!;
      const price = service.pricePerUnit;

      return {
        service_id: item.serviceId,
        quantity: null,
        price,
        subtotal: null,
      };
    });

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customer_id: userId,
          staff_id: staffId,
          orderType: dto.orderType,
          status: OrderStatus.PENDING,
          totalPrice,
          pickup_address_id: dto.pickupAddressId ?? null,
          delivery_address_id: dto.deliveryAddressId ?? null,
          pickupWindowStart: dto.pickupWindowStart
            ? new Date(dto.pickupWindowStart)
            : null,
          pickupWindowEnd: dto.pickupWindowEnd
            ? new Date(dto.pickupWindowEnd)
            : null,
          deliveryWindowStart: dto.deliveryWindowStart
            ? new Date(dto.deliveryWindowStart)
            : null,
          deliveryWindowEnd: dto.deliveryWindowEnd
            ? new Date(dto.deliveryWindowEnd)
            : null,
          notes: dto.notes ?? null,
          pickupContactName: dto.pickupContactName ?? null,
          pickupContactPhone: dto.pickupContactPhone ?? null,
          deliveryContactName: dto.deliveryContactName ?? null,
          deliveryContactPhone: dto.deliveryContactPhone ?? null,
          orderItems: { create: orderItemsData },
          trackingLogs: {
            create: {
              changed_by: userId,
              status: OrderStatus.PENDING,
              note: 'Đơn hàng được tạo',
            },
          },
        },
        include: {
          orderItems: { include: { service: true } },
          trackingLogs: true,
        },
      });

      return created;
    });

    this.eventEmitter.emit('order.status-changed', {
      orderId: order.id,
      status: OrderStatus.PENDING,
      note: 'Đơn hàng được tạo',
      timestamp: new Date(),
    });

    return order;
  }

  async cancel(id: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.customer_id !== userId) throw new ForbiddenException();
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Không thể hủy đơn hàng ở trạng thái hiện tại',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancellationReason: reason ?? null,
        },
      });

      await tx.orderTrackingLog.create({
        data: {
          order_id: id,
          changed_by: userId,
          status: OrderStatus.CANCELLED,
          note: reason ?? 'Khách hàng hủy đơn',
        },
      });

      return updated;
    });
  }

  async updateStatus(id: string, userId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển từ ${order.status} sang ${dto.status}`,
      );
    }

    const allowedFlow = ORDER_TYPE_FLOWS[order.orderType];
    if (!allowedFlow.includes(dto.status)) {
      throw new BadRequestException(
        `Loại đơn ${order.orderType} không hỗ trợ trạng thái ${dto.status}`,
      );
    }

    if (dto.status === OrderStatus.PROCESSING) {
      const hasNullQuantity = order.orderItems.some((i) => i.quantity === null);
      if (hasNullQuantity) {
        throw new BadRequestException(
          'Đơn hàng cần được cân trước khi chuyển sang Đang giặt',
        );
      }
    }

    const isShipperAssigned = order.staff_id
      ? await this.prisma.user.findFirst({
          where: { id: order.staff_id, staffType: StaffType.SHIPPER },
        })
      : null;

    if (
      dto.status === OrderStatus.RECEIVED &&
      order.status === OrderStatus.PICKING_UP &&
      isShipperAssigned
    ) {
      await this.prisma.user.update({
        where: { id: order.staff_id! },
        data: {
          currentLat: STORE_LAT,
          currentLng: STORE_LNG,
          locationUpdatedAt: new Date(),
        },
      });
    }

    if (dto.status === OrderStatus.DELIVERED && isShipperAssigned) {
      const lat = dto.lat ?? STORE_LAT;
      const lng = dto.lng ?? STORE_LNG;
      await this.prisma.user.update({
        where: { id: order.staff_id! },
        data: {
          currentLat: lat,
          currentLng: lng,
          locationUpdatedAt: new Date(),
        },
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.order.update({
        where: { id },
        data: { status: dto.status },
      });

      await tx.orderTrackingLog.create({
        data: {
          order_id: id,
          changed_by: userId,
          status: dto.status,
          note: dto.note ?? null,
        },
      });

      await tx.notification.create({
        data: {
          user_id: order.customer_id,
          title: `Đơn hàng cập nhật: ${dto.status}`,
          content: dto.note ?? `Đơn hàng chuyển sang trạng thái ${dto.status}`,
          type: 'ORDER_STATUS',
          relatedId: id,
        },
      });

      this.eventEmitter.emit('order.status-changed', {
        orderId: id,
        status: dto.status,
        note: dto.note ?? null,
        timestamp: new Date(),
      });

      return u;
    });

    if (
      dto.status === OrderStatus.CONFIRMED &&
      order.orderType === OrderType.ONLINE &&
      !isShipperAssigned
    ) {
      try {
        await this.autoAssignShipper(id, userId);
      } catch {
        // Không có shipper khả dụng — vẫn cho phép chuyển trạng thái
      }
    }

    if (dto.status === OrderStatus.COMPLETED && !isShipperAssigned) {
      try {
        await this.autoAssignShipper(id, userId);
      } catch {
        // Không có shipper khả dụng — vẫn cho phép chuyển trạng thái
      }
    }

    if (dto.status === OrderStatus.DELIVERING && !isShipperAssigned) {
      try {
        await this.autoAssignShipper(id, userId);
      } catch {
        // Không có shipper khả dụng — vẫn cho phép chuyển trạng thái
      }
    }

    return updated;
  }

  async weighOrder(id: string, userId: string, dto: WeighOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: { include: { service: true } } },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const allowedWeighStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.RECEIVED,
    ];
    if (!allowedWeighStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Đơn hàng không thể cân ở trạng thái hiện tại',
      );
    }

    const itemIds = new Set(dto.items.map((i) => i.orderItemId));
    const orderItemIds = new Set(order.orderItems.map((i) => i.id));
    for (const itemId of itemIds) {
      if (!orderItemIds.has(itemId)) {
        throw new BadRequestException(
          `OrderItem ${itemId} không thuộc đơn hàng này`,
        );
      }
    }

    let totalPrice = 0;
    for (const item of dto.items) {
      const orderItem = order.orderItems.find(
        (oi) => oi.id === item.orderItemId,
      )!;
      totalPrice += item.quantity * orderItem.price;
    }

    const shouldChangeStatus = order.status !== OrderStatus.RECEIVED;
    const newStatus = shouldChangeStatus ? OrderStatus.RECEIVED : order.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const orderItem = order.orderItems.find(
          (oi) => oi.id === item.orderItemId,
        )!;
        const subtotal = item.quantity * orderItem.price;

        await tx.orderItem.update({
          where: { id: item.orderItemId },
          data: {
            quantity: item.quantity,
            subtotal,
          },
        });
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          totalPrice,
        },
      });

      if (shouldChangeStatus) {
        const note = `Đã cân xong, tổng tiền: ${totalPrice}đ`;

        await tx.orderTrackingLog.create({
          data: {
            order_id: id,
            changed_by: userId,
            status: OrderStatus.RECEIVED,
            note,
          },
        });

        await tx.notification.create({
          data: {
            user_id: order.customer_id,
            title: 'Đơn hàng đã được cân',
            content: note,
            type: 'ORDER_STATUS',
            relatedId: id,
          },
        });
      } else {
        await tx.orderTrackingLog.create({
          data: {
            order_id: id,
            changed_by: userId,
            status: OrderStatus.RECEIVED,
            note: `Đã cập nhật cân lại, tổng tiền: ${totalPrice}đ`,
          },
        });
      }

      return updated;
    });

    this.eventEmitter.emit('order.status-changed', {
      orderId: id,
      status: newStatus,
      note: shouldChangeStatus
        ? `Đã cân xong, tổng tiền: ${totalPrice}đ`
        : `Đã cập nhật cân lại, tổng tiền: ${totalPrice}đ`,
      timestamp: new Date(),
    });

    return updated;
  }

  private haversine(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async autoAssignShipper(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { pickupAddress: true, deliveryAddress: true, staff: true },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    if (
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.DELIVERING
    ) {
      throw new BadRequestException(
        'Chỉ có thể tự động gán shipper khi đơn ở trạng thái CONFIRMED, COMPLETED hoặc DELIVERING',
      );
    }

    if (order.staff_id && order.staff?.staffType !== StaffType.WASHER) {
      throw new BadRequestException('Đơn hàng đã được gán shipper');
    }

    let targetLat: number;
    let targetLng: number;
    if (order.status === OrderStatus.CONFIRMED) {
      if (!order.pickupAddress) {
        throw new BadRequestException('Đơn hàng không có địa chỉ lấy');
      }
      targetLat = order.pickupAddress.latitude;
      targetLng = order.pickupAddress.longitude;
    } else if (order.orderType === OrderType.DROP_OFF) {
      targetLat = STORE_LAT;
      targetLng = STORE_LNG;
    } else {
      if (!order.deliveryAddress) {
        throw new BadRequestException('Đơn hàng không có địa chỉ giao');
      }
      targetLat = order.deliveryAddress.latitude;
      targetLng = order.deliveryAddress.longitude;
    }

    const shippers = await this.prisma.user.findMany({
      where: {
        role: 'STAFF',
        staffType: 'SHIPPER',
        isAvailable: true,
      },
      select: {
        id: true,
        fullName: true,
        currentLat: true,
        currentLng: true,
        locationUpdatedAt: true,
      },
    });

    if (shippers.length === 0) {
      throw new NotFoundException('Không có shipper nào đang hoạt động');
    }

    const activeOrderCounts = await this.prisma.order.groupBy({
      by: ['staff_id'],
      where: {
        staff_id: { in: shippers.map((s) => s.id) },
        status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
      },
      _count: { id: true },
    });
    const orderCountMap = new Map(
      activeOrderCounts.map((o) => [o.staff_id, o._count.id]),
    );

    const withScore = shippers.map((s) => {
      let lat = targetLat;
      let lng = targetLng;
      if (
        s.locationUpdatedAt &&
        Date.now() - s.locationUpdatedAt.getTime() < 30 * 60 * 1000 &&
        s.currentLat != null &&
        s.currentLng != null
      ) {
        lat = s.currentLat;
        lng = s.currentLng;
      }
      const distance = this.haversine(targetLat, targetLng, lat, lng);
      const activeOrders = orderCountMap.get(s.id) ?? 0;
      return { ...s, distance, activeOrders };
    });

    const maxDistance = Math.max(...withScore.map((s) => s.distance), 0.001);
    const maxWorkload = Math.max(...withScore.map((s) => s.activeOrders), 1);

    let best = withScore[0];
    let bestScore = -1;

    for (const s of withScore) {
      const distanceScore = 1 - s.distance / maxDistance;
      const workloadScore = 1 - s.activeOrders / maxWorkload;
      const totalScore = 0.7 * distanceScore + 0.3 * workloadScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        best = s;
      }
    }

    const assigned = await this.assignStaff(orderId, best.id, userId);

    if (
      order.status === OrderStatus.CONFIRMED &&
      order.orderType === OrderType.ONLINE
    ) {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PICKING_UP },
        });

        await tx.orderTrackingLog.create({
          data: {
            order_id: orderId,
            changed_by: userId,
            status: OrderStatus.PICKING_UP,
            note: 'Tự động chuyển sang lấy đồ sau khi gán shipper',
          },
        });

        await tx.notification.create({
          data: {
            user_id: order.customer_id,
            title: 'Shipper đang đến lấy đồ',
            content:
              'Shipper đã được gán và đang trên đường đến lấy đồ của bạn',
            type: 'ORDER_STATUS',
            relatedId: orderId,
          },
        });
      });

      this.eventEmitter.emit('order.status-changed', {
        orderId,
        status: OrderStatus.PICKING_UP,
        note: 'Tự động chuyển sang lấy đồ sau khi gán shipper',
        timestamp: new Date(),
      });
    }

    return assigned;
  }

  async assignStaff(id: string, staffId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { staff: true },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
    });
    if (!staff || staff.role !== Role.STAFF) {
      throw new BadRequestException('Nhân viên không tồn tại');
    }

    if (staff.staffType !== StaffType.SHIPPER) {
      throw new BadRequestException('Chỉ có thể gán Shipper cho đơn hàng');
    }

    if (
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.DELIVERING
    ) {
      throw new BadRequestException(
        'Shipper chỉ được gán khi đơn ở trạng thái CONFIRMED, COMPLETED hoặc DELIVERING',
      );
    }

    if (order.staff_id && order.staff?.staffType !== StaffType.WASHER) {
      throw new BadRequestException('Đơn hàng đã được gán shipper');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { staff_id: staffId },
      });

      const oldName = order.staff?.fullName ?? 'N/A';
      await tx.orderTrackingLog.create({
        data: {
          order_id: id,
          changed_by: userId,
          status: order.status,
          note: `Thay washer ${oldName} → shipper ${staff.fullName}`,
        },
      });

      this.eventEmitter.emit('order.assigned', {
        orderId: id,
        staffId,
        status: order.status,
        timestamp: new Date(),
      });

      return updated;
    });
  }

  async completeDelivery(
    id: string,
    userId: string,
    amountReceived?: number,
    providerOverride?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const validStatuses: OrderStatus[] = [
      OrderStatus.COMPLETED,
      OrderStatus.DELIVERING,
    ];
    if (!validStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Đơn hàng chưa sẵn sàng để hoàn tất giao hàng',
      );
    }

    return this.paymentService.processPayment(
      id,
      userId,
      order.status,
      amountReceived,
      providerOverride,
    );
  }

  async confirmPayment(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    if (
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.DELIVERING
    ) {
      throw new BadRequestException(
        'Đơn hàng chưa sẵn sàng để xác nhận thanh toán',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { order_id: id, status: PaymentStatus.PENDING },
      });

      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            paidAt: new Date(),
          },
        });
      }

      await tx.order.update({
        where: { id },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
        },
      });

      await tx.orderTrackingLog.create({
        data: {
          order_id: id,
          changed_by: userId,
          status: order.status,
          note: 'Xác nhận thanh toán thủ công',
        },
      });

      await tx.notification.create({
        data: {
          user_id: order.customer_id,
          title: 'Thanh toán thành công',
          content: `Đơn hàng ${id} đã được xác nhận thanh toán ${order.totalPrice}đ`,
          type: 'PAYMENT',
          relatedId: id,
        },
      });

      this.eventEmitter.emit('order.status-changed', {
        orderId: id,
        status: order.status,
        note: 'Xác nhận thanh toán thủ công',
        timestamp: new Date(),
      });

      return { success: true };
    });
  }
}
