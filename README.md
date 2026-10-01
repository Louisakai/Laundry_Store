# Laundry Store

Full-stack laundry service platform with web, admin, and mobile applications.

## Repository Structure

```
laundry-be/    # Backend API (NestJS)
laundry-fe/    # Frontend Web (Next.js + React)
laundry-mobile/ # Mobile App (Expo + React Native)
```

## Projects

### 1. Backend (`laundry-be/`)

A NestJS-based REST API server with real-time capabilities.

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Passport
- **Real-time**: Socket.IO
- **Payment**: PayOS integration
- **Key Features**:
  - Module-based architecture (auth, order, service, staff, admin, payment, notification, review, route, OSM)
  - Prisma migrations and seeding
  - E2E testing with Jest
  - WebSocket order tracking

**Commands**:
```bash
cd laundry-be
pnpm install
pnpm build     # prisma generate + nest build
pnpm start:dev # start development server
pnpm test      # run unit tests
```

### 2. Frontend Web (`laundry-fe/`)

A Next.js 14 application with React 18.

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript with React 18
- **Styling**: Tailwind CSS + shadcn-ui
- **State**: React Query + Zustand
- **Map**: MapVina GL integration
- **Charts**: Recharts
- **Key Features**:
  - Dashboard, admin, staff, customer pages
  - Address management with MapVina autocomplete
  - Order tracking and management
  - Real-time socket communication
  - Toast notifications with Sonner

**Commands**:
```bash
cd laundry-fe
pnpm install
pnpm dev       # start development server (next dev)
pnpm build     # build for production
pnpm start     # start production server
pnpm lint      # run ESLint
```

### 3. Mobile App (`laundry-mobile/`)

An Expo/React Native application for iOS and Android.

- **Framework**: Expo 57 + React Native 0.86
- **Language**: TypeScript (React 19)
- **Styling**: Tailwind CSS (nativewind)
- **State**: React Query + Zustand
- **Map**: MapLibre React Native
- **Key Features**:
  - Customer ordering flow
  - Staff dashboard
  - Profile and settings
  - QR code scanning
  - Location-based services

**Commands**:
```bash
cd laundry-mobile
pnpm install
pnpm start     # start Expo development server
pnpm android   # run on Android
pnpm ios       # run on iOS
pnpm web       # start web version
pnpm lint      # run ESLint
```

## Development

Each project is independent with its own `package.json`. The workspace is managed manually - navigate to each directory to run commands.

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11, TypeScript, Prisma, PostgreSQL |
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Mobile | Expo 57, React Native 0.86, Tailwind CSS |
| API Docs | OpenAPI / Swagger (implicit from NestJS) |
| Database | PostgreSQL |
| Real-time | Socket.IO |
| Deployment | Docker-ready (Prisma, NestJS) |