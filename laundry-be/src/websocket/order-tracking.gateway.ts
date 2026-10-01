import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WsException,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@WebSocketGateway({
  namespace: '/orders',
  cors: { origin: '*', credentials: true },
})
export class OrderTrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.query?.token as string);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      (client as any).user = payload;

      if (payload.role === 'STAFF' || payload.role === 'ADMIN') {
        client.join(`staff-${payload.userId}`);
      } else if (payload.role === 'CUSTOMER') {
        client.join(`customer-${payload.userId}`);
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    // no-op
  }

  @SubscribeMessage('join-order')
  handleJoinOrder(client: Socket, orderId: string) {
    if (!orderId) throw new WsException('Missing orderId');
    client.join(`order-${orderId}`);
    return { event: 'joined', data: { orderId } };
  }

  @SubscribeMessage('leave-order')
  handleLeaveOrder(client: Socket, orderId: string) {
    client.leave(`order-${orderId}`);
    return { event: 'left', data: { orderId } };
  }

  @OnEvent('order.status-changed')
  async handleOrderStatusChanged(payload: {
    orderId: string;
    status: string;
    note?: string;
    timestamp: Date;
  }) {
    const rooms: string[] = [`order-${payload.orderId}`];
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: payload.orderId },
      });
      if (order) {
        if (order.customer_id) rooms.push(`customer-${order.customer_id}`);
        if (order.staff_id) rooms.push(`staff-${order.staff_id}`);
      }
    } catch {
      // Bỏ qua nếu không tra được đơn — vẫn gửi tới room của đơn
    }
    this.server?.to(rooms).emit('order-status-changed', payload);
  }

  @OnEvent('order.assigned')
  handleOrderAssigned(payload: {
    orderId: string;
    staffId: string;
    status: string;
    timestamp: Date;
  }) {
    this.server
      ?.to(`staff-${payload.staffId}`)
      .emit('order-assigned', payload);
    this.server
      ?.to(`order-${payload.orderId}`)
      .emit('order-assigned', payload);
  }

  @OnEvent('staff.location-updated')
  handleStaffLocationUpdated(payload: {
    staffId: string;
    lat: number;
    lng: number;
    timestamp: Date;
  }) {
    this.server
      ?.to(`staff-${payload.staffId}`)
      .emit('location-updated', payload);
  }
}
