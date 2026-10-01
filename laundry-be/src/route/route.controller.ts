import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RouteService } from './route.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('route')
@UseGuards(JwtAuthGuard)
export class RouteController {
  constructor(private routeService: RouteService) {}

  @Post('optimize')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF')
  optimize(@Body('shipperId') shipperId: string) {
    return this.routeService.optimize(shipperId);
  }

  @Get('nearest-shipper')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findNearestShipper(@Query('addressId') addressId: string) {
    return this.routeService.findNearestShipper(addressId);
  }

  @Post('navigate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF')
  navigate(
    @Body('shipperId') shipperId: string,
    @Body('orderId') orderId: string,
    @Body('direction') direction: 'pickup' | 'delivery' | 'store',
    @Body('currentLat') currentLat?: number,
    @Body('currentLng') currentLng?: number,
  ) {
    return this.routeService.navigate(shipperId, orderId, direction, currentLat, currentLng);
  }
}
