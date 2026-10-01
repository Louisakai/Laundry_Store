# Laundry Store

Laundry Store là hệ thống quản lý dịch vụ giặt ủi gồm API backend, ứng dụng web cho khách hàng và nhân viên, cùng ứng dụng di động.

## Cấu trúc dự án

```text
laundry-be/       API NestJS, Prisma, PostgreSQL và kiểm thử backend
laundry-fe/       Ứng dụng web Next.js cho khách hàng và nhân viên
laundry-mobile/   Ứng dụng Expo / React Native cho Android và iOS
```

## Công nghệ sử dụng

- Backend: NestJS 11, TypeScript, Prisma, PostgreSQL và Socket.IO
- Web: Next.js 14, React 18, Tailwind CSS và TanStack Query
- Mobile: Expo 57, React Native 0.86 và NativeWind
- Thanh toán: PayOS
- Bản đồ: MapVina trên web và mobile

## Yêu cầu môi trường

- Node.js 20 trở lên
- npm hoặc pnpm
- PostgreSQL, có thể dùng PostgreSQL cục bộ hoặc Supabase
- Android Studio và máy ảo Android nếu chạy mobile trên Android
- Xcode nếu build mobile cho iOS trên macOS

## Cài đặt

Cài dependency cho từng ứng dụng:

```bash
cd laundry-be
npm install

cd ../laundry-fe
npm install

cd ../laundry-mobile
npm install
```

Tạo file cấu hình môi trường từ các file mẫu. Trên Windows:

```powershell
Copy-Item laundry-be\.env.example laundry-be\.env
Copy-Item laundry-fe\.env.example laundry-fe\.env.local
Copy-Item laundry-mobile\.env.example laundry-mobile\.env
```

Trên macOS/Linux:

```bash
cp laundry-be/.env.example laundry-be/.env
cp laundry-fe/.env.example laundry-fe/.env.local
cp laundry-mobile/.env.example laundry-mobile/.env
```

Điền các giá trị database, JWT, MapVina và PayOS nếu sử dụng thanh toán trực tuyến. Không commit các file `.env` thật lên Git. Khi chạy ứng dụng mobile trên điện thoại thật, `EXPO_PUBLIC_API_URL` phải trỏ đến địa chỉ IP LAN của máy chạy backend, không dùng `localhost`.

## Chạy backend

Từ thư mục `laundry-be/`, cấu hình `DATABASE_URL` và `DIRECT_URL`, sau đó tạo Prisma Client và chạy migration:

```bash
npm run build
npx prisma generate
npx prisma migrate dev
```

Khởi động API ở chế độ phát triển:

```bash
npm run start:dev
```

Backend mặc định chạy tại `http://localhost:3000`. Các lệnh kiểm thử:

```bash
npm test
npm run test:e2e
npm run test:cov
```

## Chạy web

Từ thư mục `laundry-fe/`:

```bash
npm run dev -- -p 3001
```

Mở `http://localhost:3001` và đặt `NEXT_PUBLIC_API_URL=http://localhost:3000` trong `.env.local`.

Build và chạy production:

```bash
npm run build
npm run start
```

## Chạy mobile

Từ thư mục `laundry-mobile/`:

```bash
npm start
npm run android
npm run ios
npm run web
```

`npm start` mở Expo Development Server. Có thể chạy bằng máy ảo, development build hoặc thiết bị thật tùy nền tảng.

## Biến môi trường chính

### Backend

- `DATABASE_URL`, `DIRECT_URL`: chuỗi kết nối PostgreSQL
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: khóa ký token
- `PORT`: cổng API, mặc định `3000`
- `CORS_ORIGIN`: danh sách origin được phép
- `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`: cấu hình PayOS tùy chọn

### Web

- `NEXT_PUBLIC_API_URL`: địa chỉ backend API
- `NEXT_PUBLIC_MAPVINA_API_KEY`: khóa MapVina

### Mobile

- `EXPO_PUBLIC_API_URL`: địa chỉ backend có thể truy cập từ thiết bị
- `EXPO_PUBLIC_MAPVINA_API_KEY`: khóa MapVina

