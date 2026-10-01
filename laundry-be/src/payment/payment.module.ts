import { Module, OnModuleInit } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule implements OnModuleInit {
  constructor(private paymentService: PaymentService) {}

  async onModuleInit() {
    await this.paymentService.confirmWebhook();
  }
}
