# Laundry Store

Hệ thống nền tảng laundry đầy đủ tính năng với web, admin và ứng dụng di động.

# Laundry Store

Laundry Store is a full-stack laundry management platform with a NestJS API,
a Next.js web application and an Expo React Native mobile application.

## Repository layout

```text
laundry-be/       NestJS API, Prisma schema and backend tests
laundry-fe/       Next.js web client for customers and staff
laundry-mobile/   Expo/React Native mobile client
docs/             Architecture, deployment and project notes
```

## Technology

- Backend: NestJS 11, TypeScript, Prisma, PostgreSQL and Socket.IO
- Web: Next.js 14, React 18, Tailwind CSS and TanStack Query
- Mobile: Expo 57, React Native 0.86 and NativeWind
- Payments: PayOS integration in the backend
- Maps: MapVina integration in web and mobile clients

## Requirements

- Node.js 20 or newer
- npm, pnpm or another Node package manager
- PostgreSQL database (Supabase or a local PostgreSQL instance)
- Android Studio and an Android emulator/device for native mobile development
- Xcode is required only for iOS builds on macOS

## Setup

Install dependencies in each application directory:

```bash
cd laundry-be && npm install
cd ../laundry-fe && npm install
cd ../laundry-mobile && npm install
```

Create local environment files from the examples. Never commit the resulting
files because they can contain credentials:

```bash
copy laundry-be\.env.example laundry-be\.env
copy laundry-fe\.env.example laundry-fe\.env.local
copy laundry-mobile\.env.example laundry-mobile\.env
```

Fill in the database, JWT, API, MapVina and optional PayOS values before
starting the applications. For a physical phone, the mobile API URL must use
the computer's LAN IP instead of `localhost`.

## Database and backend

From `laundry-be/`, configure `DATABASE_URL` and `DIRECT_URL`, then generate
the Prisma client and apply migrations:

```bash
npm run build
npx prisma generate
npx prisma migrate dev
```

Start the API in development mode:

```bash
npm run start:dev
```

The default API port is `3000`. Backend tests are available with:

```bash
npm test
npm run test:e2e
npm run test:cov
```

## Web application

From `laundry-fe/`:

```bash
npm run dev
```

Open `http://localhost:3001` if the default Next.js port is configured to
avoid the backend, or use the URL printed by Next.js. Set
`NEXT_PUBLIC_API_URL` to the running backend URL.

Production commands:

```bash
npm run build
npm run start
```

## Mobile application

From `laundry-mobile/`:

```bash
npm start
npm run android
npm run ios
npm run web
```

`npm start` opens the Expo development server. Use a development build or an
Expo-compatible device/emulator, and set `EXPO_PUBLIC_API_URL` to a reachable
backend address.

## Git and sensitive files

The root `.gitignore` excludes dependencies, build output, local environment
files, logs, coverage and generated native artifacts. Environment templates,
source code, migrations and documentation remain tracked. Review secrets
before every push.

## Further documentation

See the files in [`docs/`](docs/) and the application-specific READMEs for
deployment guides, API notes, mobile build instructions and project history.
