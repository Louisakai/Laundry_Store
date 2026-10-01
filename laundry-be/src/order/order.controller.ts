import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { WeighOrderDto } from './dto/weigh-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.orderService.findAll(req.user.userId, req.user.role, req.user.staffType);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.orderService.findOne(id, req.user.userId, req.user.role);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @Req() req: any) {
    return this.orderService.create(req.user.userId, dto);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string | undefined,
    @Req() req: any,
  ) {
    return this.orderService.cancel(id, req.user.userId, reason);
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF')
  assignStaff(
    @Param('id') id: string,
    @Body('staffId') staffId: string,
    @Req() req: any,
  ) {
    return this.orderService.assignStaff(id, staffId, req.user.userId);
  }

  @Post(':id/auto-assign')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  autoAssignShipper(@Param('id') id: string, @Req() req: any) {
    return this.orderService.autoAssignShipper(id, req.user.userId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: any,
  ) {
    return this.orderService.updateStatus(id, req.user.userId, dto);
  }

  @Patch(':id/weigh')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  weighOrder(
    @Param('id') id: string,
    @Body() dto: WeighOrderDto,
    @Req() req: any,
  ) {
    return this.orderService.weighOrder(id, req.user.userId, dto);
  }

  @Post(':id/complete-delivery')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  completeDelivery(
    @Param('id') id: string,
    @Body('amountReceived') amountReceived: number | undefined,
    @Body('provider') provider: string | undefined,
    @Req() req: any,
  ) {
    return this.orderService.completeDelivery(id, req.user.userId, amountReceived, provider);
  }

  @Post(':id/confirm-payment')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  confirmPayment(@Param('id') id: string, @Req() req: any) {
    return this.orderService.confirmPayment(id, req.user.userId);
  }
}
