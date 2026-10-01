import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ServiceService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const services = await this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { created_at: 'desc' },
      include: {
        orderItems: {
          where: {
            order: { status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] } },
          },
          select: { id: true },
        },
      },
    });

    return services.map(({ orderItems, ...service }) => ({
      ...service,
      orderCount: orderItems.length,
    }));
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Dịch vụ không tồn tại');
    return service;
  }

  async create(dto: CreateServiceDto) {
    return this.prisma.service.create({ data: dto });
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
