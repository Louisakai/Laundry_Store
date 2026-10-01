import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServiceModule } from './service/service.module';
import { AddressModule } from './address/address.module';
import { OrderModule } from './order/order.module';
import { WebSocketModule } from './websocket/websocket.module';
import { PaymentModule } from './payment/payment.module';
import { ReviewModule } from './review/review.module';
import { NotificationModule } from './notification/notification.module';
import { StaffModule } from './staff/staff.module';
import { RouteModule } from './route/route.module';
import { OsmModule } from './osm/osm.module';
import { AdminModule } from './admin/admin.module';
import { PayModule } from './pay/pay.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    ServiceModule,
    AddressModule,
    OrderModule,
    WebSocketModule,
    PaymentModule,
    ReviewModule,
    NotificationModule,
    StaffModule,
    RouteModule,
    OsmModule,
    AdminModule,
    PayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
