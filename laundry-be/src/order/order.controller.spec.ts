import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderStatus } from '@prisma/client';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: any;

  const mockOrderService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    cancel: jest.fn(),
    updateStatus: jest.fn(),
    weighOrder: jest.fn(),
    completeDelivery: jest.fn(),
  };

  const mockReq = (overrides = {}) => ({
    user: { userId: 'user-1', role: 'STAFF' },
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: mockOrderService }],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateStatus', () => {
    it('should call orderService.updateStatus', async () => {
      const dto = { status: OrderStatus.PICKING_UP, note: 'Đang lấy đồ' };
      await controller.updateStatus('order-1', dto, mockReq());
      expect(mockOrderService.updateStatus).toHaveBeenCalledWith(
        'order-1',
        'user-1',
        dto,
      );
    });
  });

  describe('weighOrder', () => {
    it('should call orderService.weighOrder', async () => {
      const dto = { items: [{ orderItemId: 'item-1', quantity: 2.5 }] };
      await controller.weighOrder('order-1', dto, mockReq());
      expect(mockOrderService.weighOrder).toHaveBeenCalledWith(
        'order-1',
        'user-1',
        dto,
      );
    });
  });

  describe('completeDelivery', () => {
    it('should call orderService.completeDelivery', async () => {
      await controller.completeDelivery('order-1', undefined, undefined, mockReq());
      expect(mockOrderService.completeDelivery).toHaveBeenCalledWith(
        'order-1',
        'user-1',
        undefined,
        undefined,
      );
    });
  });
});
