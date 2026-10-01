import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentService } from '../payment/payment.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, OrderType } from '@prisma/client';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: any;
  let eventEmitter: any;

  const mockOrder = {
    id: 'order-1',
    customer_id: 'user-1',
    status: OrderStatus.CONFIRMED,
    orderType: OrderType.ONLINE,
    totalPrice: 0,
    paymentMethod: 'CASH',
    orderItems: [
      {
        id: 'item-1',
        quantity: null,
        price: 20000,
        service: { name: 'Giặt thường' },
      },
    ],
  };

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    orderItem: { update: jest.fn() },
    orderTrackingLog: { create: jest.fn() },
    notification: { create: jest.fn() },
    payment: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    service: { findMany: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
  };

  const mockEventEmitter = { emit: jest.fn() };
  const mockPaymentService = {
    processPayment: jest.fn(),
    verifyAndProcessWebhook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw when DROP_OFF missing deliveryWindowStart', async () => {
      prisma.service.findMany.mockResolvedValue([
        { id: 'svc-1', name: 'Giặt thường', pricePerUnit: 20000, isActive: true },
      ]);

      await expect(
        service.create('user-1', {
          orderType: OrderType.DROP_OFF,
          deliveryAddressId: 'addr-1',
          items: [{ serviceId: 'svc-1', quantity: 2 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should succeed when DROP_OFF has deliveryWindowStart/End', async () => {
      prisma.service.findMany.mockResolvedValue([
        { id: 'svc-1', name: 'Giặt thường', pricePerUnit: 20000, isActive: true },
      ]);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        await cb(mockPrisma);
        return {
          id: 'order-2',
          orderType: OrderType.DROP_OFF,
          status: OrderStatus.PENDING,
        };
      });

      const result = await service.create('user-1', {
        orderType: OrderType.DROP_OFF,
        deliveryAddressId: 'addr-1',
        deliveryWindowStart: '2026-07-01T08:00:00Z',
        deliveryWindowEnd: '2026-07-01T18:00:00Z',
        items: [{ serviceId: 'svc-1', quantity: 2 }],
      } as any);
      expect(result.status).toBe(OrderStatus.PENDING);
    });
  });

  describe('updateStatus', () => {
    it('should throw when order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('order-1', 'staff-1', {
          status: OrderStatus.PICKING_UP,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw on invalid transition', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.RECEIVED,
      });
      await expect(
        service.updateStatus('order-1', 'staff-1', {
          status: OrderStatus.CONFIRMED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw PICKING_UP for WALKIN', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        orderType: OrderType.WALKIN,
        status: OrderStatus.CONFIRMED,
      });
      await expect(
        service.updateStatus('order-1', 'staff-1', {
          status: OrderStatus.PICKING_UP,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw RECEIVED for ONLINE without weighing', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      await expect(
        service.updateStatus('order-1', 'staff-1', {
          status: OrderStatus.RECEIVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should succeed with valid transition', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PICKING_UP,
      });
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        await cb(mockPrisma);
        return { ...mockOrder, status: OrderStatus.PICKING_UP };
      });

      const result = await service.updateStatus('order-1', 'staff-1', {
        status: OrderStatus.PICKING_UP,
      });
      expect(result.status).toBe(OrderStatus.PICKING_UP);
    });

    it('should allow DROP_OFF CONFIRMED -> RECEIVED', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        orderType: OrderType.DROP_OFF,
        status: OrderStatus.CONFIRMED,
      });
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        await cb(mockPrisma);
        return { ...mockOrder, status: OrderStatus.RECEIVED };
      });

      const result = await service.updateStatus('order-1', 'staff-1', {
        status: OrderStatus.RECEIVED,
      });
      expect(result.status).toBe(OrderStatus.RECEIVED);
    });

    it('should allow DROP_OFF COMPLETED -> DELIVERING', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        orderType: OrderType.DROP_OFF,
        status: OrderStatus.COMPLETED,
      });
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        await cb(mockPrisma);
        return { ...mockOrder, status: OrderStatus.DELIVERING };
      });

      const result = await service.updateStatus('order-1', 'staff-1', {
        status: OrderStatus.DELIVERING,
      });
      expect(result.status).toBe(OrderStatus.DELIVERING);
    });

    it('should allow DELIVERING -> DELIVERED', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERING,
      });
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        await cb(mockPrisma);
        return { ...mockOrder, status: OrderStatus.DELIVERED };
      });

      const result = await service.updateStatus('order-1', 'staff-1', {
        status: OrderStatus.DELIVERED,
      });
      expect(result.status).toBe(OrderStatus.DELIVERED);
    });
  });

  describe('weighOrder', () => {
    it('should throw when order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.weighOrder('order-1', 'staff-1', {
          items: [{ orderItemId: 'item-1', quantity: 2.5 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when order already weighed', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.RECEIVED,
      });
      await expect(
        service.weighOrder('order-1', 'staff-1', {
          items: [{ orderItemId: 'item-1', quantity: 2.5 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when orderItemId not in order', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      await expect(
        service.weighOrder('order-1', 'staff-1', {
          items: [{ orderItemId: 'item-999', quantity: 2.5 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow DROP_OFF to be weighed', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        orderType: OrderType.DROP_OFF,
        status: OrderStatus.CONFIRMED,
      });
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        await cb(mockPrisma);
        return { ...mockOrder, status: OrderStatus.RECEIVED, totalPrice: 50000 };
      });

      const result = await service.weighOrder('order-1', 'staff-1', {
        items: [{ orderItemId: 'item-1', quantity: 2.5 }],
      });
      expect(result.status).toBe(OrderStatus.RECEIVED);
    });

    it('should succeed and calculate totalPrice', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        await cb(mockPrisma);
        return {
          ...mockOrder,
          status: OrderStatus.RECEIVED,
          totalPrice: 50000,
        };
      });

      const result = await service.weighOrder('order-1', 'staff-1', {
        items: [{ orderItemId: 'item-1', quantity: 2.5 }],
      });
      expect(result.status).toBe(OrderStatus.RECEIVED);
      expect(result.totalPrice).toBe(50000);
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });
  });

  describe('completeDelivery', () => {
    it('should throw when order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.completeDelivery('order-1', 'staff-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when status not COMPLETED or DELIVERING', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PROCESSING,
      });
      await expect(
        service.completeDelivery('order-1', 'staff-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delegate to paymentService.processPayment', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
      });
      mockPaymentService.processPayment.mockResolvedValue({
        status: OrderStatus.DELIVERED,
        checkoutUrl: null,
      });

      const result = await service.completeDelivery('order-1', 'staff-1');
      expect(mockPaymentService.processPayment).toHaveBeenCalledWith(
        'order-1',
        'staff-1',
        OrderStatus.COMPLETED,
      );
      expect(result.status).toBe(OrderStatus.DELIVERED);
    });
  });
});
