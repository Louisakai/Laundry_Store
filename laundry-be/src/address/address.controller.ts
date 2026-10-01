import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private addressService: AddressService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.addressService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.addressService.findOne(id, req.user.userId);
  }

  @Post()
  create(@Body() dto: CreateAddressDto, @Req() req: any) {
    return this.addressService.create(req.user.userId, dto, req.user.role);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
    @Req() req: any,
  ) {
    return this.addressService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.addressService.remove(id, req.user.userId);
  }

  @Patch(':id/set-default')
  setDefault(@Param('id') id: string, @Req() req: any) {
    return this.addressService.setDefault(id, req.user.userId);
  }
}
