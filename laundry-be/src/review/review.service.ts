import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { OrderStatus, OrderType } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(orderId: string, userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { review: true },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.customer_id !== userId) throw new ForbiddenException();
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Chỉ có thể đánh giá đơn đã giao');
    }
    if (order.review) {
      throw new BadRequestException('Đơn hàng đã được đánh giá');
    }
    if (order.orderType === OrderType.WALKIN && dto.shipperRating != null) {
      throw new BadRequestException('Đơn WALKIN không có shipper để đánh giá');
    }

    return this.prisma.review.create({
      data: {
        order_id: orderId,
        customer_id: userId,
        staff_id: order.staff_id,
        serviceRating: dto.serviceRating,
        serviceComment: dto.serviceComment ?? null,
        shipperRating: dto.shipperRating ?? null,
        shipperComment: dto.shipperComment ?? null,
      },
      include: { order: true },
    });
  }

  async findByOrder(orderId: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (role === 'CUSTOMER' && order.customer_id !== userId) {
      throw new ForbiddenException();
    }

    const review = await this.prisma.review.findUnique({
      where: { order_id: orderId },
    });
    if (!review) throw new NotFoundException('Đơn hàng chưa được đánh giá');
    return review;
  }

  async findByStaff(staffId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { staff_id: staffId },
      orderBy: { created_at: 'desc' },
      include: {
        order: { select: { id: true, orderType: true } },
        customer: { select: { fullName: true } },
      },
    });
    return reviews;
  }
}
