import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post('orders/:id/review')
  create(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.create(id, req.user.userId, dto);
  }

  @Get('orders/:id/review')
  findByOrder(@Param('id') id: string, @Req() req: any) {
    return this.reviewService.findByOrder(id, req.user.userId, req.user.role);
  }

  @Get('reviews/staff/:staffId')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  findByStaff(@Param('staffId') staffId: string) {
    return this.reviewService.findByStaff(staffId);
  }
}
