import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { OsmService } from './osm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('osm')
@UseGuards(JwtAuthGuard)
export class OsmController {
  constructor(private osmService: OsmService) {}

  @Post('shortest-path')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF')
  findShortestPath(
    @Body('from') from: { lat: number; lng: number },
    @Body('to') to: { lat: number; lng: number },
  ) {
    const result = this.osmService.findShortestPath(from, to);
    if (!result) {
      return {
        success: false,
        error: 'Không thể tìm đường đi. Graph OSM chưa sẵn sàng hoặc không có đường đi.',
      };
    }
    return { success: true, data: result };
  }

  @Get('status')
  getStatus() {
    return this.osmService.getGraphStats();
  }
}
