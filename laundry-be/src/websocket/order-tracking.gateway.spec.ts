import { Test, TestingModule } from '@nestjs/testing';
import { OrderTrackingGateway } from './order-tracking.gateway';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from '../prisma/prisma.service';

describe('OrderTrackingGateway', () => {
  let gateway: OrderTrackingGateway;
  let jwtService: any;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
    },
  };

  const mockSocket: any = {
    handshake: { auth: { token: 'valid-token' }, query: {} },
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
  };

  const mockServer: any = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderTrackingGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    gateway = module.get<OrderTrackingGateway>(OrderTrackingGateway);
    jwtService = module.get(JwtService);
    gateway.server = mockServer;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should accept connection with valid token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        userId: 'user-1',
        role: 'CUSTOMER',
      });
      await gateway.handleConnection(mockSocket);
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should join customer room for CUSTOMER role', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        userId: 'user-1',
        role: 'CUSTOMER',
      });
      await gateway.handleConnection(mockSocket);
      expect(mockSocket.join).toHaveBeenCalledWith('customer-user-1');
    });

    it('should join staff room for STAFF role', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        userId: 'user-1',
        role: 'STAFF',
      });
      await gateway.handleConnection(mockSocket);
      expect(mockSocket.join).toHaveBeenCalledWith('staff-user-1');
    });

    it('should disconnect with invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      await gateway.handleConnection(mockSocket);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect without token', async () => {
      const noTokenSocket = {
        handshake: { auth: {}, query: {} },
        disconnect: jest.fn(),
      };
      await gateway.handleConnection(noTokenSocket);
      expect(noTokenSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleJoinOrder', () => {
    it('should join order room', () => {
      const result = gateway.handleJoinOrder(mockSocket, 'order-1');
      expect(mockSocket.join).toHaveBeenCalledWith('order-order-1');
      expect(result).toEqual({ event: 'joined', data: { orderId: 'order-1' } });
    });

    it('should throw on missing orderId', () => {
      expect(() => gateway.handleJoinOrder(mockSocket, '')).toThrow(
        WsException,
      );
    });
  });

  describe('handleLeaveOrder', () => {
    it('should leave order room', () => {
      const result = gateway.handleLeaveOrder(mockSocket, 'order-1');
      expect(mockSocket.leave).toHaveBeenCalledWith('order-order-1');
      expect(result).toEqual({ event: 'left', data: { orderId: 'order-1' } });
    });
  });

  describe('handleOrderStatusChanged', () => {
    it('should emit to order room when lookup fails', async () => {
      const payload = {
        orderId: 'order-1',
        status: 'RECEIVED',
        note: 'Đã cân xong',
        timestamp: new Date(),
      };
      mockPrismaService.order.findUnique.mockResolvedValue(null);
      await gateway.handleOrderStatusChanged(payload);
      expect(mockServer.to).toHaveBeenCalledWith(['order-order-1']);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'order-status-changed',
        payload,
      );
    });

    it('should emit to customer and staff rooms for the order', async () => {
      const payload = {
        orderId: 'order-1',
        status: 'DELIVERED',
        note: 'Thanh toán thành công',
        timestamp: new Date(),
      };
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        customer_id: 'cust-1',
        staff_id: 'staff-1',
      });
      await gateway.handleOrderStatusChanged(payload);
      expect(mockServer.to).toHaveBeenCalledWith([
        'order-order-1',
        'customer-cust-1',
        'staff-staff-1',
      ]);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'order-status-changed',
        payload,
      );
    });
  });
});
