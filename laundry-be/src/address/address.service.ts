import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

const STORE_ACCOUNT_EMAIL = 'store@laundry.com';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.address.findMany({
      where: { user_id: userId },
      orderBy: [{ isDefault: 'desc' }, { created_at: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) throw new NotFoundException('Địa chỉ không tồn tại');
    if (address.user_id !== userId) throw new ForbiddenException();
    return address;
  }

  async create(userId: string, dto: CreateAddressDto, role?: string) {
    let ownerId = userId;
    if (dto.owner === 'store' && (role === 'STAFF' || role === 'ADMIN')) {
      const storeUser = await this.prisma.user.findUnique({
        where: { email: STORE_ACCOUNT_EMAIL },
        select: { id: true },
      });
      if (storeUser) ownerId = storeUser.id;
    }
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { user_id: ownerId, isDefault: true },
        data: { isDefault: false },
      });
    }
    const { owner, ...data } = dto;
    return this.prisma.address.create({
      data: { ...data, user_id: ownerId },
    });
  }

  async update(id: string, userId: string, dto: UpdateAddressDto) {
    await this.findOne(id, userId);
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { user_id: userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.address.delete({ where: { id } });
  }

  async setDefault(id: string, userId: string) {
    await this.findOne(id, userId);
    const [, address] = await this.prisma.$transaction([
      this.prisma.address.updateMany({
        where: { user_id: userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.address.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
    return address;
  }
}
