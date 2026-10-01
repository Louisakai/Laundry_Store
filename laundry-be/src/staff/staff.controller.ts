import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StaffType } from '@prisma/client';

@Controller()
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Get('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query('staffType') staffType?: StaffType,
    @Query('isAvailable') isAvailable?: string,
    @Query('workZone') workZone?: string,
  ) {
    return this.staffService.findAll({
      staffType,
      isAvailable:
        isAvailable !== undefined ? isAvailable === 'true' : undefined,
      workZone,
    });
  }

  @Post('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(
    @Body()
    data: {
      email: string;
      password: string;
      fullName: string;
      phone: string;
      staffType: StaffType;
      workZone?: string;
    },
  ) {
    return this.staffService.create(data);
  }

  // Static routes MUST be declared before 'staff/:id' so they aren't shadowed.
  @Get('staff/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF')
  getMyOrders(@Req() req: any) {
    return this.staffService.getMyOrders(req.user.userId);
  }

  @Patch('staff/location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF')
  updateLocation(@Req() req: any, @Body() body: { lat: number; lng: number }) {
    return this.staffService.updateLocation(
      req.user.userId,
      body.lat,
      body.lng,
    );
  }

  @Patch('staff/location/store')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF')
  setLocationToStore(@Req() req: any) {
    return this.staffService.setLocationToStore(req.user.userId);
  }

  @Patch('staff/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF')
  toggleAvailability(@Req() req: any) {
    return this.staffService.toggleAvailability(req.user.userId);
  }

  @Get('staff/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Patch('staff/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body()
    data: {
      staffType?: StaffType;
      workZone?: string;
      isAvailable?: boolean;
      password?: string;
    },
  ) {
    return this.staffService.update(id, data);
  }

  @Delete('staff/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }
}
