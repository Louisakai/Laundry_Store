import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('StaffController (route ordering)', () => {
  let app: INestApplication<App>;

  const service = {
    getMyOrders: jest.fn().mockResolvedValue([{ id: 'order-1' }]),
    updateLocation: jest.fn().mockResolvedValue({ id: 'staff-1' }),
    setLocationToStore: jest.fn().mockResolvedValue({ id: 'staff-1' }),
    toggleAvailability: jest
      .fn()
      .mockResolvedValue({ id: 'staff-1', isAvailable: true }),
    findOne: jest.fn().mockResolvedValue({ id: 'some-staff' }),
  };

  const passAuth: CanActivate = {
    canActivate: (ctx) => {
      const req = ctx.switchToHttp().getRequest<{
        user: { userId: string; role: string; staffType: string };
      }>();
      req.user = { userId: 'staff-1', role: 'STAFF', staffType: 'SHIPPER' };
      return true;
    },
  };
  const passRoles: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [{ provide: StaffService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passAuth)
      .overrideGuard(RolesGuard)
      .useValue(passRoles)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('GET /staff/orders resolves to getMyOrders, not findOne', async () => {
    await request(app.getHttpServer()).get('/staff/orders').expect(200);
    expect(service.getMyOrders).toHaveBeenCalledWith('staff-1');
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('PATCH /staff/location resolves to updateLocation', async () => {
    await request(app.getHttpServer())
      .patch('/staff/location')
      .send({ lat: 10.03, lng: 105.77 })
      .expect(200);
    expect(service.updateLocation).toHaveBeenCalledWith(
      'staff-1',
      10.03,
      105.77,
    );
  });

  it('PATCH /staff/location/store resolves to setLocationToStore', async () => {
    await request(app.getHttpServer())
      .patch('/staff/location/store')
      .expect(200);
    expect(service.setLocationToStore).toHaveBeenCalledWith('staff-1');
  });

  it('PATCH /staff/availability resolves to toggleAvailability', async () => {
    await request(app.getHttpServer()).patch('/staff/availability').expect(200);
    expect(service.toggleAvailability).toHaveBeenCalledWith('staff-1');
  });

  it('GET /staff/:id still resolves to findOne', async () => {
    await request(app.getHttpServer()).get('/staff/some-staff-id').expect(200);
    expect(service.findOne).toHaveBeenCalledWith('some-staff-id');
  });
});
