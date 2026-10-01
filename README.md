# Laundry Store

Hệ thống nền tảng laundry đầy đủ tính năng với web, admin và ứng dụng di động.

## Cấu trúc Repository

```
laundry-be/    # Backend API (NestJS)
laundry-fe/    # Frontend Web (Next.js + React)
laundry-mobile/ # Mobile App (Expo + React Native)
```

## Các Dự án

### 1. Backend (`laundry-be/`)

REST API server dựa trên NestJS với khả năng thời gian thực.

- **Framework**: NestJS 11
- **Ngôn ngữ**: TypeScript
- **Database**: PostgreSQL với Prisma ORM
- **Authentication**: JWT + Passport
- **Real-time**: Socket.IO
- **Payment**: PayOS integration
- **Tính năng chính**:
  - Cấu trúc module (auth, order, service, staff, admin, payment, notification, review, route, OSM)
  - Migrations và seeding Prisma
  - Testing E2E với Jest
  - Theo dõi WebSocket đơn hàng

**Lệnh chạy**:
```bash
cd laundry-be
pnpm install
pnpm build      # prisma generate + nest build
pnpm start:dev  # start development server
pnpm test        # chạy unit tests
```

### 2. Frontend Web (`laundry-fe/`)

Ứng dụng Next.js 14 với React 18.

- **Framework**: Next.js 14 (App Router)
- **Ngôn ngữ**: TypeScript với React 18
- **Styling**: Tailwind CSS + shadcn-ui
- **State**: React Query + Zustand
- **Map**: MapVina GL integration
- **Charts**: Recharts
- **Tính năng chính**:
  - Dashboard, admin, staff, customer pages
  - Quản lý địa chỉ với MapVina autocomplete
  - Quản lý và theo dõi đơn hàng
  - Tương tác socket thời thực
  - Thông báo toast với Sonner

**Lệnh chạy**:
```bash
cd laundry-fe
pnpm install
pnpm dev        # start development server (next dev)
pnpm build      # build cho production
pnpm start      # start production server
pnpm lint       # chạy ESLint
```

### 3. Mobile App (`laundry-mobile/`)

Ứng dụng Expo + React Native cho iOS và Android.

- **Framework**: Expo 57 + React Native 0.86
- **Ngôn ngữ**: TypeScript (React 19)
- **Styling**: Tailwind CSS (nativewind)
- **State**: React Query + Zustand
- **Map**: MapLibre React Native
- **Tính năng chính**:
  - Luồng đặt hàng cho khách hàng
  - Bảng điều khiển staff
  - Profile và cài đặt
  - Quét mã QR
  - Dịch vụ dựa trên vị trí

**Lệnh chạy**:
```bash
cd laundry-mobile
pnpm install
pnpm start      # start Expo development server
pnpm android    # chạy trên Android
pnpm ios        # chạy trên iOS
pnpm web        # start web version
pnpm lint       # chạy ESLint
```

## Tổng quan Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11, TypeScript, Prisma, PostgreSQL |
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Mobile | Expo 57, React Native 0.86, Tailwind CSS |
| API Docs | OpenAPI / Swagger (từ NestJS) |
| Database | PostgreSQL |
| Real-time | Socket.IO |
| Deployment | Docker-ready (Prisma, NestJS) |