import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Patch,
  Body,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrderStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('orders')
  @Roles('ADMIN', 'STAFF')
  getOrders(
    @Query('status') status?: OrderStatus,
    @Query('orderType') orderType?: string,
    @Query('workZone') workZone?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getOrders({
      status,
      orderType,
      workZone,
      fromDate,
      toDate,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  @Roles('ADMIN')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('analytics/revenue')
  @Roles('ADMIN')
  getRevenue(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.adminService.getRevenue(fromDate, toDate);
  }

  @Get('analytics/orders')
  @Roles('ADMIN')
  getAnalyticsOrders(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.adminService.getAnalyticsOrders(fromDate, toDate);
  }

  @Get('analytics/staff')
  @Roles('ADMIN')
  getStaffAnalytics() {
    return this.adminService.getStaffAnalytics();
  }

  @Get('analytics/daily-revenue')
  @Roles('ADMIN')
  getDailyRevenue(
    @Query('days') days?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.adminService.getDailyRevenue(days ? parseInt(days) : undefined, fromDate, toDate);
  }

  @Get('analytics/services')
  @Roles('ADMIN')
  getServiceAnalytics() {
    return this.adminService.getServiceAnalytics();
  }

  @Get('analytics/service-reviews')
  @Roles('ADMIN')
  getServiceReviews() {
    return this.adminService.getServiceReviews();
  }

  @Patch('orders/:id/services')
  @Roles('ADMIN')
  updateOrderServices(
    @Param('id') id: string,
    @Body() body: { items: { orderItemId: string; quantity: number }[] },
  ) {
    return this.adminService.updateOrderServices(id, body.items);
  }

  @Patch('orders/:id/price')
  @Roles('ADMIN')
  updateOrderPrice(
    @Param('id') id: string,
    @Body() body: { totalPrice: number },
  ) {
    return this.adminService.updateOrderPrice(id, body.totalPrice);
  }
}
