import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get('payos-webhook')
  @HttpCode(200)
  verifyWebhook() {
    return { success: true };
  }

  @Post('payos-webhook')
  @HttpCode(200)
  async handlePayOSWebhook(@Body() body: any) {
    try {
      return await this.paymentService.verifyAndProcessWebhook(body);
    } catch {
      return { success: false };
    }
  }
}
