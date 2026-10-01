import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StaffType, Role, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(data: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    staffType: StaffType;
    workZone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException('Email đã tồn tại');

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: Role.STAFF,
        staffType: data.staffType,
        workZone: data.workZone,
        isAvailable: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        staffType: true,
        workZone: true,
        isAvailable: true,
      },
    });
  }

  async findAll(params: {
    staffType?: StaffType;
    isAvailable?: boolean;
    workZone?: string;
  }) {
    const where: any = { role: Role.STAFF };
    if (params.staffType) where.staffType = params.staffType;
    if (params.isAvailable !== undefined) where.isAvailable = params.isAvailable;
    if (params.workZone) where.workZone = params.workZone;

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        staffType: true,
        workZone: true,
        isAvailable: true,
        currentLat: true,
        currentLng: true,
        locationUpdatedAt: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id, role: Role.STAFF },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        staffType: true,
        workZone: true,
        isAvailable: true,
        currentLat: true,
        currentLng: true,
        locationUpdatedAt: true,
        created_at: true,
        ordersAsStaff: {
          select: {
            id: true,
            status: true,
            totalPrice: true,
            orderType: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
          take: 20,
        },
      },
    });
    if (!staff) throw new NotFoundException('Nhân viên không tồn tại');
    return staff;
  }

  async update(id: string, data: {
    staffType?: StaffType;
    workZone?: string;
    isAvailable?: boolean;
    password?: string;
  }) {
    const staff = await this.prisma.user.findFirst({
      where: { id, role: Role.STAFF },
    });
    if (!staff) throw new NotFoundException('Nhân viên không tồn tại');

    const updateData: any = { ...data };
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }
    delete updateData.password;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        staffType: true,
        workZone: true,
        isAvailable: true,
      },
    });
  }

  async remove(id: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id, role: Role.STAFF },
    });
    if (!staff) throw new NotFoundException('Nhân viên không tồn tại');

    const activeOrders = await this.prisma.order.count({
      where: {
        staff_id: id,
        status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
      },
    });
    if (activeOrders > 0) {
      throw new BadRequestException(
        'Không thể xóa nhân viên khi còn đơn hàng đang xử lý',
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'Xóa nhân viên thành công' };
  }

  async getMyOrders(staffId: string) {
    return this.prisma.order.findMany({
      where: { staff_id: staffId },
      include: {
        orderItems: { include: { service: true } },
        pickupAddress: true,
        deliveryAddress: true,
        customer: {
          select: { id: true, fullName: true, phone: true },
        },
        trackingLogs: { orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 5 },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateLocation(staffId: string, lat: number, lng: number) {
    const staff = await this.prisma.user.findFirst({
      where: { id: staffId, role: Role.STAFF },
    });
    if (!staff) throw new ForbiddenException('Không phải nhân viên');
    if (staff.staffType !== StaffType.SHIPPER) {
      throw new ForbiddenException('Chỉ Shipper mới được cập nhật vị trí');
    }

    const result = await this.prisma.user.update({
      where: { id: staffId },
      data: {
        currentLat: lat,
        currentLng: lng,
        locationUpdatedAt: new Date(),
      },
      select: {
        id: true,
        currentLat: true,
        currentLng: true,
        locationUpdatedAt: true,
      },
    });

    this.eventEmitter.emit('staff.location-updated', {
      staffId,
      lat,
      lng,
      timestamp: new Date(),
    });

    return result;
  }

  async setLocationToStore(staffId: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id: staffId, role: Role.STAFF },
    });
    if (!staff) throw new ForbiddenException('Không phải nhân viên');
    if (staff.staffType !== StaffType.SHIPPER) return { id: staffId };

    const storeLat = parseFloat(process.env.STORE_LAT || '10.03');
    const storeLng = parseFloat(process.env.STORE_LNG || '105.77');

    const result = await this.prisma.user.update({
      where: { id: staffId },
      data: { currentLat: storeLat, currentLng: storeLng, locationUpdatedAt: new Date() },
      select: { id: true, currentLat: true, currentLng: true },
    });

    this.eventEmitter.emit('staff.location-updated', {
      staffId,
      lat: storeLat,
      lng: storeLng,
      timestamp: new Date(),
    });

    return result;
  }

  async toggleAvailability(staffId: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id: staffId, role: Role.STAFF },
    });
    if (!staff) throw new ForbiddenException('Không phải nhân viên');

    return this.prisma.user.update({
      where: { id: staffId },
      data: { isAvailable: !staff.isAvailable },
      select: { id: true, isAvailable: true },
    });
  }
}
