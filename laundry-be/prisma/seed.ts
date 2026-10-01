import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...');

  // 1. Tạo dịch vụ
  const services = await prisma.service.createMany({
    data: [
      {
        name: 'Giặt sấy đồ thường',
        pricePerUnit: 15000,
        unit: 'kg',
        description: 'Giặt sấy quần áo thông thường',
      },
      {
        name: 'Giặt hấp áo vest',
        pricePerUnit: 50000,
        unit: 'cái',
        description: 'Giặt hấp chuyên dụng cho vest, áo dạ hội',
      },
      {
        name: 'Vệ sinh giày thể thao',
        pricePerUnit: 80000,
        unit: 'đôi',
        description: 'Vệ sinh giày sneaker, giày da',
      },
      {
        name: 'Giặt chăn ga gối',
        pricePerUnit: 25000,
        unit: 'kg',
        description: 'Giặt chăn, ga, gối, mền',
      },
      {
        name: 'Ủi đồ',
        pricePerUnit: 10000,
        unit: 'kg',
        description: 'Ủi đồ không giặt',
      },
    ],
  });
  console.log(`✅ Đã tạo ${services.count} dịch vụ`);

  // 2. Tạo admin mặc định
  const admin = await prisma.user.upsert({
    where: { email: 'admin@laundry.com' },
    update: {},
    create: {
      email: 'admin@laundry.com',
      passwordHash: hashPassword('Admin@123'),
      fullName: 'Admin Tiệm',
      phone: '0900000000',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Đã tạo admin: ${admin.email}`);

  // 2b. Tạo tài khoản "Cửa hàng" — nơi lưu địa chỉ giao của khách tại quầy (DROP_OFF),
  //     tránh làm bẩn sổ địa chỉ cá nhân của nhân viên
  const store = await prisma.user.upsert({
    where: { email: 'store@laundry.com' },
    update: {},
    create: {
      email: 'store@laundry.com',
      passwordHash: hashPassword('KhongTheLogin@999'),
      fullName: 'Cửa hàng',
      phone: '0900000001',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Đã tạo tài khoản cửa hàng: ${store.email}`);

  // 3. Tạo 1 nhân viên WASHER và 1 SHIPPER mẫu
  const washer = await prisma.user.upsert({
    where: { email: 'washer1@laundry.com' },
    update: {},
    create: {
      email: 'washer1@laundry.com',
      passwordHash: hashPassword('NhanVien@123'),
      fullName: 'Nguyễn Văn A',
      phone: '0911111111',
      role: 'STAFF',
      staffType: 'WASHER',
      isAvailable: true,
    },
  });

  const shipper = await prisma.user.upsert({
    where: { email: 'shipper1@laundry.com' },
    update: {},
    create: {
      email: 'shipper1@laundry.com',
      passwordHash: hashPassword('NhanVien@123'),
      fullName: 'Trần Văn B',
      phone: '0922222222',
      role: 'STAFF',
      staffType: 'SHIPPER',
      isAvailable: true,
      workZone: 'Ninh Kiều, Cần Thơ',
    },
  });
  console.log(
    `✅ Đã tạo nhân viên: ${washer.fullName} (WASHER), ${shipper.fullName} (SHIPPER)`,
  );

  // 4. Tạo 1 khách hàng mẫu
  const customer = await prisma.user.upsert({
    where: { email: 'customer1@gmail.com' },
    update: {},
    create: {
      email: 'customer1@gmail.com',
      passwordHash: hashPassword('Khach@123'),
      fullName: 'Lê Thị C',
      phone: '0933333333',
      role: 'CUSTOMER',
      preferences: { detergent: 'Comfort', fold: true },
    },
  });
  console.log(`✅ Đã tạo khách hàng: ${customer.fullName}`);

  // 5. Tạo địa chỉ mẫu cho khách hàng
  const customerAddresses = [
    {
      label: 'Nhà riêng',
      addressLine: '123 Nguyễn Văn Cừ, An Hòa, Ninh Kiều, Cần Thơ',
      latitude: 10.0412,
      longitude: 105.7465,
      isDefault: true,
    },
    {
      label: 'Văn phòng',
      addressLine: '45 Mậu Thân, Xuân Khánh, Ninh Kiều, Cần Thơ',
      latitude: 10.0246,
      longitude: 105.7689,
      isDefault: false,
    },
  ];

  for (const addr of customerAddresses) {
    await prisma.address.create({
      data: {
        user_id: customer.id,
        label: addr.label,
        addressLine: addr.addressLine,
        latitude: addr.latitude,
        longitude: addr.longitude,
        isDefault: addr.isDefault,
      },
    });
  }
  console.log(`✅ Đã tạo ${customerAddresses.length} địa chỉ cho khách hàng`);

  // 6. Tạo thêm 1 shipper và 1 washer nữa để test VRP
  const shipper2 = await prisma.user.upsert({
    where: { email: 'shipper2@laundry.com' },
    update: {},
    create: {
      email: 'shipper2@laundry.com',
      passwordHash: hashPassword('NhanVien@123'),
      fullName: 'Phạm Thị D',
      phone: '0944444444',
      role: 'STAFF',
      staffType: 'SHIPPER',
      isAvailable: true,
      workZone: 'Cái Răng, Cần Thơ',
      currentLat: 10.0123,
      currentLng: 105.7801,
      locationUpdatedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: 'washer2@laundry.com' },
    update: {},
    create: {
      email: 'washer2@laundry.com',
      passwordHash: hashPassword('NhanVien@123'),
      fullName: 'Hoàng Văn E',
      phone: '0955555555',
      role: 'STAFF',
      staffType: 'WASHER',
      isAvailable: true,
    },
  });
  console.log(`✅ Đã tạo thêm nhân viên: ${shipper2.fullName} (SHIPPER)`);

  // 7. Tạo đơn hàng mẫu (đã hoàn thành)
  const laundryServiceIds = await prisma.service.findMany({ select: { id: true } });
  const customerAddressIds = await prisma.address.findMany({
    where: { user_id: customer.id },
  });

  const sampleOrder = await prisma.order.create({
    data: {
      customer_id: customer.id,
      staff_id: shipper.id,
      pickup_address_id: customerAddressIds[0].id,
      delivery_address_id: customerAddressIds[1].id,
      status: 'DELIVERED',
      totalPrice: 65000,
      orderType: 'ONLINE',
      paymentMethod: 'CASH',
      paymentStatus: 'SUCCESS',
      pickupWindowStart: new Date('2026-07-10T08:00:00Z'),
      pickupWindowEnd: new Date('2026-07-10T10:00:00Z'),
      deliveryWindowStart: new Date('2026-07-11T14:00:00Z'),
      deliveryWindowEnd: new Date('2026-07-11T17:00:00Z'),
      orderItems: {
        create: [
          {
            service_id: laundryServiceIds[0].id,
            quantity: 3,
            price: 15000,
            subtotal: 45000,
          },
          {
            service_id: laundryServiceIds[4].id,
            quantity: 2,
            price: 10000,
            subtotal: 20000,
          },
        ],
      },
      trackingLogs: {
        create: [
          { changed_by: customer.id, status: 'PENDING', note: 'Đơn hàng được tạo' },
          { changed_by: admin.id, status: 'CONFIRMED', note: 'Admin xác nhận đơn' },
          { changed_by: shipper.id, status: 'PICKING_UP', note: 'Shipper đã lấy đồ' },
          { changed_by: washer.id, status: 'RECEIVED', note: 'Đã nhận đồ tại tiệm' },
          { changed_by: washer.id, status: 'PROCESSING', note: 'Bắt đầu giặt' },
          { changed_by: washer.id, status: 'COMPLETED', note: 'Giặt xong' },
          { changed_by: shipper.id, status: 'DELIVERING', note: 'Shipper đang giao' },
          { changed_by: shipper.id, status: 'DELIVERED', note: 'Đã giao - thanh toán COD 65,000đ' },
        ],
      },
    },
  });
  console.log(`✅ Đã tạo đơn mẫu: #${sampleOrder.id.slice(0, 8)}`);

  // 8. Tạo review mẫu cho đơn đã hoàn thành
  await prisma.review.upsert({
    where: { order_id: sampleOrder.id },
    update: {},
    create: {
      order_id: sampleOrder.id,
      customer_id: customer.id,
      staff_id: shipper.id,
      serviceRating: 5,
      serviceComment: 'Dịch vụ tốt, đúng hẹn',
      shipperRating: 5,
      shipperComment: 'Shipper thân thiện, giao đúng giờ',
    },
  });
  console.log('✅ Đã tạo đánh giá mẫu');

  console.log('🎉 Seed hoàn tất!');
  console.log('');
  console.log('📋 Tài khoản mẫu:');
  console.log('  Admin:     admin@laundry.com / Admin@123');
  console.log('  Shipper 1: shipper1@laundry.com / NhanVien@123');
  console.log('  Shipper 2: shipper2@laundry.com / NhanVien@123');
  console.log('  Washer 1:  washer1@laundry.com / NhanVien@123');
  console.log('  Washer 2:  washer2@laundry.com / NhanVien@123');
  console.log('  Customer:  customer1@gmail.com / Khach@123');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
