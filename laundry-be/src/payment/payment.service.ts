import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async confirmWebhook(): Promise<boolean> {
    const hasPayosConfig =
      process.env.PAYOS_CLIENT_ID &&
      process.env.PAYOS_API_KEY &&
      process.env.PAYOS_CHECKSUM_KEY;
    const webhookUrl = process.env.PAYOS_WEBHOOK_URL;

    if (!hasPayosConfig || !webhookUrl) {
      this.logger.warn(
        'PAYOS_WEBHOOK_URL chưa được cấu hình, webhook PayOS sẽ không được đăng ký',
      );
      return false;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PayOS: PayOSClient } = require('@payos/node');
      const payosClient = new (PayOSClient as any)({
        clientId: process.env.PAYOS_CLIENT_ID,
        apiKey: process.env.PAYOS_API_KEY,
        checksumKey: process.env.PAYOS_CHECKSUM_KEY,
      });

      await payosClient.webhooks.confirm(webhookUrl);
      this.logger.log(`PayOS webhook đã đăng ký: ${webhookUrl}`);
      return true;
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Không thể đăng ký webhook PayOS: ${message}`);
      return false;
    }
  }

  async processPayment(
    orderId: string,
    userId: string,
    currentStatus: OrderStatus,
    amountReceived?: number,
    providerOverride?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const validStatuses: OrderStatus[] = [
      OrderStatus.COMPLETED,
      OrderStatus.DELIVERING,
    ];
    if (!validStatuses.includes(currentStatus)) {
      throw new BadRequestException(
        'Trạng thái đơn hàng không hợp lệ để hoàn tất giao hàng',
      );
    }

    const provider = providerOverride ?? order.paymentMethod;

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          order_id: orderId,
          provider: provider as PaymentProvider,
          amount: order.totalPrice,
          status: PaymentStatus.PENDING,
        },
      });

      if (provider === PaymentProvider.CASH) {
        const received = amountReceived ?? order.totalPrice;
        const change = received - order.totalPrice;

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.DELIVERED,
            paymentStatus: PaymentStatus.SUCCESS,
          },
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            paidAt: new Date(),
          },
        });

        const changeNote = change > 0 ? ` (tiền thừa: ${change}đ)` : '';
        await tx.orderTrackingLog.create({
          data: {
            order_id: orderId,
            changed_by: userId,
            status: OrderStatus.DELIVERED,
            note: `Thanh toán COD thành công: ${order.totalPrice}đ - Nhận: ${received}đ${changeNote}`,
          },
        });

        await tx.notification.create({
          data: {
            user_id: order.customer_id,
            title: 'Đơn hàng đã giao thành công',
            content: `Đơn hàng ${orderId} đã được giao và thanh toán COD ${order.totalPrice}đ`,
            type: 'ORDER_STATUS',
            relatedId: orderId,
          },
        });

        this.eventEmitter.emit('order.status-changed', {
          orderId,
          status: OrderStatus.DELIVERED,
          note: `Thanh toán COD thành công`,
          timestamp: new Date(),
        });

        return { status: OrderStatus.DELIVERED, payment, checkoutUrl: null };
      }

      if (provider === PaymentProvider.PAYOS) {
        let checkoutUrl: string | null = null;
        let qrCode: string | null = null;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

        const hasPayosConfig =
          process.env.PAYOS_CLIENT_ID &&
          process.env.PAYOS_API_KEY &&
          process.env.PAYOS_CHECKSUM_KEY;

        if (hasPayosConfig) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { PayOS: PayOSClient } = require('@payos/node');
            const payosClient = new (PayOSClient as any)({
              clientId: process.env.PAYOS_CLIENT_ID,
              apiKey: process.env.PAYOS_API_KEY,
              checksumKey: process.env.PAYOS_CHECKSUM_KEY,
            });

            const orderCode = Date.now();
            const payosData = await payosClient.paymentRequests.create({
              orderCode,
              amount: Math.round(order.totalPrice),
              description: `Thanh toán đơn ${orderId.slice(0, 8)}`,
              returnUrl:
                process.env.PAYOS_RETURN_URL ?? `${appUrl}/orders`,
              cancelUrl:
                process.env.PAYOS_CANCEL_URL ?? `${appUrl}/orders`,
            });

            checkoutUrl = payosData?.checkoutUrl ?? null;
            qrCode = payosData?.qrCode ?? null;

            await tx.payment.update({
              where: { id: payment.id },
              data: {
                providerRef: String(orderCode),
                providerPayload: payosData,
              },
            });

            await tx.orderTrackingLog.create({
              data: {
                order_id: orderId,
                changed_by: userId,
                status: currentStatus,
                note: `Chờ thanh toán qua PayOS: ${order.totalPrice}đ`,
              },
            });
          } catch (error: any) {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: PaymentStatus.FAILED },
            });
            const payosErr = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(
              `Lỗi tạo link thanh toán PayOS: ${payosErr}`,
            );
          }
        } else {
          checkoutUrl = `${appUrl}/pay/${orderId}`;
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              providerRef: `TEST-${Date.now()}`,
              providerPayload: { testMode: true, url: checkoutUrl },
            },
          });

          await tx.orderTrackingLog.create({
            data: {
              order_id: orderId,
              changed_by: userId,
              status: currentStatus,
              note: `Test payment: ${order.totalPrice}đ (QR tại ${checkoutUrl})`,
            },
          });
        }

        this.eventEmitter.emit('order.status-changed', {
          orderId,
          status: currentStatus,
          note: `Chờ thanh toán PayOS`,
          timestamp: new Date(),
        });

        return { status: currentStatus, payment, checkoutUrl, qrCode };
      }

      throw new BadRequestException('Phương thức thanh toán không hợp lệ');
    });
  }

  async verifyAndProcessWebhook(webhookData: any) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PayOS: PayOSClient } = require('@payos/node');
      const payosClient = new (PayOSClient as any)({
        clientId: process.env.PAYOS_CLIENT_ID,
        apiKey: process.env.PAYOS_API_KEY,
        checksumKey: process.env.PAYOS_CHECKSUM_KEY,
      });

      const data = await payosClient.webhooks.verify(webhookData);

      const { orderCode, code } = data;

      const payment = await this.prisma.payment.findFirst({
        where: { providerRef: String(orderCode) },
        include: { order: true },
      });
      if (!payment) {
        throw new NotFoundException('Không tìm thấy giao dịch');
      }

      if (code === '00') {
        return this.prisma.$transaction(async (tx) => {
          const wasDelivered = payment.order.status === OrderStatus.DELIVERED;

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              paidAt: new Date(),
              providerPayload: webhookData,
            },
          });

          await tx.order.update({
            where: { id: payment.order_id },
            data: {
              status: OrderStatus.DELIVERED,
              paymentStatus: PaymentStatus.SUCCESS,
            },
          });

          const order = payment.order;

          if (!wasDelivered) {
            await tx.orderTrackingLog.create({
              data: {
                order_id: payment.order_id,
                changed_by: order.staff_id ?? order.customer_id,
                status: OrderStatus.DELIVERED,
                note: `Thanh toán PayOS thành công: ${payment.amount}đ`,
              },
            });
          }

          await tx.notification.create({
            data: {
              user_id: order.customer_id,
              title: 'Thanh toán thành công',
              content: `Đơn hàng ${payment.order_id} đã thanh toán ${payment.amount}đ qua PayOS`,
              type: 'PAYMENT',
              relatedId: payment.order_id,
            },
          });

          this.eventEmitter.emit('order.status-changed', {
            orderId: payment.order_id,
            status: OrderStatus.DELIVERED,
            note: `Thanh toán PayOS thành công`,
            timestamp: new Date(),
          });

          return { success: true };
        });
      }

      if (code !== '00') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            providerPayload: webhookData,
          },
        });
        return { success: false };
      }

      return { success: true };
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Webhook processing error: ${message}`);
    }
  }
}
