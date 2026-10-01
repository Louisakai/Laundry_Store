import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrderTrackingGateway } from './order-tracking.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRY ?? '15m') as any,
      },
    }),
  ],
  providers: [OrderTrackingGateway],
})
export class WebSocketModule {}
