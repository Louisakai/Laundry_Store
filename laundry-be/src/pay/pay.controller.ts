import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller('pay')
export class PayController {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Get(':id')
  async renderPayPage(@Param('id') id: string, @Res() res: Response) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: { include: { service: true } } },
    });
    if (!order) {
      return res.status(404).send('<h1>Không tìm thấy đơn hàng</h1>');
    }

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác nhận thanh toán</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); width: 100%; max-width: 360px; overflow: hidden; }
    .header { text-align: center; padding: 24px 16px 16px; }
    .icon { width: 48px; height: 48px; border-radius: 50%; background: #e8f0fe; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; }
    .icon svg { width: 24px; height: 24px; }
    .icon.success { background: #e6f7e6; }
    .icon.success svg { stroke: #22c55e; }
    h1 { font-size: 20px; color: #1a1a1a; }
    .body { padding: 0 16px 24px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .row .label { color: #666; }
    .row .value { font-weight: 500; color: #1a1a1a; }
    .divider { height: 1px; background: #e5e5e5; margin: 8px 0; }
    .total { font-size: 18px; font-weight: 700; }
    .total .value { color: #1a1a1a; }
    .btn { display: block; width: 100%; padding: 14px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 16px; transition: opacity 0.2s; }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-success { background: #22c55e; color: white; }
    .msg { text-align: center; font-size: 13px; color: #666; margin-top: 12px; }
    .error { color: #ef4444; text-align: center; margin-top: 12px; font-size: 13px; display: none; }
  </style>
</head>
<body>
  <div class="card" id="app">
    <div class="header">
      <div class="icon" id="iconBox">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      </div>
      <h1 id="title">Xác nhận thanh toán</h1>
    </div>
    <div class="body">
      <div class="row"><span class="label">Đơn hàng</span><span class="value">#${id.slice(0, 8)}</span></div>
      <div class="row"><span class="label">Trạng thái</span><span class="value">${order.status}</span></div>
      <div class="row">
        <span class="label">Dịch vụ</span>
        <span class="value">${order.orderItems.map(i => i.service.name).join(', ')}</span>
      </div>
      <div class="divider"></div>
      <div class="row total"><span class="label">Tổng tiền</span><span class="value">${order.totalPrice.toLocaleString('vi-VN')}đ</span></div>
      <button class="btn btn-primary" id="confirmBtn" onclick="confirmPay()">Xác nhận đã thanh toán</button>
      <div class="error" id="errorMsg"></div>
      <div class="msg" id="successMsg" style="display:none">Đơn hàng đã được thanh toán thành công. Bạn có thể đóng trang này.</div>
    </div>
  </div>
  <script>
    async function confirmPay() {
      const btn = document.getElementById('confirmBtn');
      const errEl = document.getElementById('errorMsg');
      const successEl = document.getElementById('successMsg');
      const iconBox = document.getElementById('iconBox');
      const title = document.getElementById('title');
      btn.disabled = true;
      btn.textContent = 'Đang xử lý...';
      errEl.style.display = 'none';
      try {
        const res = await fetch('/pay/${id}/confirm', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi xác nhận');
        btn.style.display = 'none';
        successEl.style.display = 'block';
        iconBox.className = 'icon success';
        iconBox.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        title.textContent = 'Thanh toán thành công';
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Xác nhận đã thanh toán';
      }
    }
  </script>
</body>
</html>`;
    res.type('text/html').send(html);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  async confirmPayment(@Param('id') id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    const payment = await this.prisma.payment.findFirst({
      where: { order_id: id, status: PaymentStatus.PENDING },
    });

    await this.prisma.$transaction(async (tx) => {
      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.SUCCESS, paidAt: new Date() },
        });
      }

      await tx.order.update({
        where: { id },
        data: { paymentStatus: PaymentStatus.SUCCESS },
      });

      await tx.notification.create({
        data: {
          user_id: order.customer_id,
          title: 'Thanh toán thành công',
          content: `Đơn hàng ${id} đã thanh toán ${order.totalPrice}đ`,
          type: 'PAYMENT',
          relatedId: id,
        },
      });
    });

    this.eventEmitter.emit('order.status-changed', {
      orderId: id,
      status: order.status,
      note: 'Xác nhận thanh toán qua QR test',
      timestamp: new Date(),
    });

    return { success: true };
  }
}
