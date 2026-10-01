import { Module } from '@nestjs/common';
import { PayController } from './pay.controller';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [OrderModule],
  controllers: [PayController],
})
export class PayModule {}
