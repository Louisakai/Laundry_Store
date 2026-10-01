import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';

jest.mock('@payos/node', () => ({
  PayOS: jest.fn(),
}));

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: any;
  let eventEmitter: any;
  let PayOS: any;

  const mockOrder = {
    id: 'order-1',
    customer_id: 'user-1',
    status: OrderStatus.COMPLETED,
    totalPrice: 50000,
    paymentMethod: PaymentProvider.CASH,
  };

  const mockPayment = {
    id: 'payment-1',
    order_id: 'order-1',
    provider: PaymentProvider.CASH,
    amount: 50000,
    status: PaymentStatus.PENDING,
  };

  const createPayOSMock = (overrides = {}) => ({
    paymentRequests: {
      create: jest
        .fn()
        .mockResolvedValue({ checkoutUrl: 'https://payos.vn/checkout/123' }),
    },
    webhooks: {
      verify: jest.fn().mockImplementation(async (webhook: any) => webhook.data),
    },
    ...overrides,
  });

  const mockPrisma = {
    order: { findUnique: jest.fn(), update: jest.fn() },
    payment: {
      create: jest.fn().mockResolvedValue(mockPayment),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    orderTrackingLog: { create: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
  };

  const mockEventEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    PayOS = require('@payos/node').PayOS;
    PayOS.mockImplementation(() => createPayOSMock());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
    jest.clearAllMocks();
    mockPrisma.$transaction = jest.fn((cb: any) => cb(mockPrisma));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processPayment', () => {
    it('should throw when order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.processPayment('order-1', 'staff-1', OrderStatus.COMPLETED),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when status invalid', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      await expect(
        service.processPayment('order-1', 'staff-1', OrderStatus.PROCESSING),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process COD payment successfully', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        await cb(mockPrisma);
        return {
          status: OrderStatus.DELIVERED,
          payment: mockPayment,
          checkoutUrl: null,
        };
      });

      const result = await service.processPayment(
        'order-1',
        'staff-1',
        OrderStatus.COMPLETED,
      );
      expect(result.status).toBe(OrderStatus.DELIVERED);
      expect(result.checkoutUrl).toBeNull();
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it('should return checkoutUrl for PAYOS', async () => {
      const payosOrder = { ...mockOrder, paymentMethod: PaymentProvider.PAYOS };
      prisma.order.findUnique.mockResolvedValue(payosOrder);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        await cb(mockPrisma);
        return {
          status: OrderStatus.COMPLETED,
          payment: { ...mockPayment, provider: PaymentProvider.PAYOS },
          checkoutUrl: 'https://payos.vn/checkout/123',
        };
      });

      const result = await service.processPayment(
        'order-1',
        'staff-1',
        OrderStatus.COMPLETED,
      );
      expect(result.checkoutUrl).toBe('https://payos.vn/checkout/123');
      expect(result.status).toBe(OrderStatus.COMPLETED);
    });
  });

  describe('verifyAndProcessWebhook', () => {
    it('should throw on invalid signature', async () => {
      PayOS.mockImplementation(() =>
        createPayOSMock({
          webhooks: {
            verify: jest.fn().mockRejectedValue(new Error('Invalid signature')),
          },
        }),
      );

      await expect(
        service.verifyAndProcessWebhook({ data: {} }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when payment not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyAndProcessWebhook({
          data: { orderCode: '999', code: '00' },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should process successful PAID webhook', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        order: mockOrder,
      });

      const result = await service.verifyAndProcessWebhook({
        data: { orderCode: '123', code: '00' },
      });
      expect(result.success).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it('should process failed webhook without error', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        order: mockOrder,
      });

      const result = await service.verifyAndProcessWebhook({
        data: { orderCode: '123', code: '99' },
      });
      expect(result.success).toBe(false);
    });
  });
});
