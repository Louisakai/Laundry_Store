# Deploy Backend lên Railway — Tổng kết

## Kiến trúc

```
Frontend (Vercel)  ──HTTPS──>  Backend (Railway)  ──Prisma──>  Supabase (PostgreSQL)
   laundry-fe-plum.vercel.app    web-production-6f589.up.railway.app
```

Database Supabase dùng chung cho cả local và production (cùng DATABASE_URL).

---

## Các bước đã thực hiện

### 1. Tạo file cần thiết cho Railway

| File | Nội dung | Mục đích |
|------|----------|----------|
| `Procfile` | `web: node dist/main` | Railway dùng để biết command start server |
| `DEPLOY_RAILWAY_GUIDE.md` | Hướng dẫn chi tiết | Tài liệu deploy |

### 2. Sửa Prisma config (`prisma.config.ts`)

**Vấn đề:** Prisma v7 dùng `env('DATABASE_URL')` throw error nếu biến không tồn tại.

**Fix:** Đổi từ `env()` sang `process.env` + fallback:
```ts
url: process.env.DATABASE_URL || 'postgresql://localhost:5432/dummy',
```

### 3. Sửa TypeScript config (`tsconfig.json`)

**Vấn đề 1:** `module: "nodenext"` compile ra ESM, không tương thích với Node.js CommonJS.

**Fix:**
```json
"module": "commonjs",
"moduleResolution": "node10"
```

**Vấn đề 2:** Không có `rootDir`, output ra `dist/src/main.js` thay vì `dist/main.js`.

**Fix:**
```json
"rootDir": "src",
"outDir": "./dist"
```

### 4. Sửa build config (`tsconfig.build.json`)

**Vấn đề:** File `prisma.config.ts` và `prisma/seed.ts` nằm ngoài `rootDir: "src"`, gây lỗi build.

**Fix:** Exclude các file không cần thiết:
```json
"exclude": ["node_modules", "test", "dist", "prisma", "prisma.config.ts", "**/*spec.ts"]
```

### 5. Xoá incremental build cache

**Vấn đề:** `"incremental": true` + file `tsconfig.build.tsbuildinfo` bị commit vào git → Railway dùng cache cũ → không compile lại → `dist/` rỗng.

**Fix:**
- Xoá `"incremental": true` khỏi `tsconfig.json`
- Xoá `tsconfig.build.tsbuildinfo` khỏi git
- Thêm `*.tsbuildinfo` vào `.gitignore`

### 6. Cập nhật `.gitignore`

Thêm các compiled artifacts:
```
prisma/*.js
prisma/*.d.ts
prisma/*.js.map
prisma.config.js
prisma.config.d.ts
prisma.config.js.map
*.tsbuildinfo
```

### 7. Fix environment variables

Các biến cần set trên Railway Dashboard (tab Variables):

| Variable | Giá trị |
|---|---|
| `DATABASE_URL` | `postgresql://...supabase.co:5432/...` |
| `DIRECT_URL` | `postgresql://...supabase.co:6543/...` |
| `JWT_SECRET` | *(secret key)* |
| `JWT_REFRESH_SECRET` | *(secret key)* |
| `JWT_ACCESS_EXPIRY` | `2h` |
| `JWT_REFRESH_EXPIRY` | `7d` |
| `CORS_ORIGIN` | `https://laundry-fe-plum.vercel.app` |
| `NODE_ENV` | `production` |

### 8. Fix lỗi runtime

**Vấn đề:** `JwtStrategy requires a secret or key` — thiếu `JWT_SECRET` env var.

**Fix:** Thêm `JWT_SECRET` vào Railway Variables.

### 9. Fix phone validation (`register.dto.ts`)

**Vấn đề:** Regex `/^(0[3-9]\d{8,9})$/` quá chặt, từ chối số điện thoại hợp lệ.

**Fix:** Nới lỏng thành `/^(0\d{9,10})$/`

### 10. Fix customer password

**Vấn đề:** `customer1@gmail.com` có password hash cũ không khớp với `Khach@123`.

**Fix:** Chạy script `prisma/fix-customer-password.ts` để update hash.

---

## Các lỗi đã gặp & cách xử lý

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `Cannot resolve env DATABASE_URL` | Prisma v7 `env()` throw error khi thiếu biến | Dùng `process.env` + fallback |
| `128 TypeScript errors` | Prisma client chưa generate | Thêm `prisma generate &&` vào build script |
| `Cannot find module '/app/dist/main'` | Output ở `dist/src/main.js` do thiếu `rootDir` | Thêm `rootDir: "src"` |
| Build thành công nhưng `dist/` rỗng | Incremental build cache (`tsbuildinfo`) | Xoá `incremental` + cache file |
| `JwtStrategy requires a secret or key` | Thiếu `JWT_SECRET` env var trên Railway | Thêm env var |
| `Cannot find module './app.module'` | Build cache cũ, không compile lại | Xoá cache, force rebuild |

---

## Tài khoản mẫu (seed)

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `admin@laundry.com` | `Admin@123` | Admin |
| `customer1@gmail.com` | `Khach@123` | Khách hàng |
| `shipper1@laundry.com` | `NhanVien@123` | Shipper |
| `shipper2@laundry.com` | `NhanVien@123` | Shipper |
| `washer1@laundry.com` | `NhanVien@123` | Washer |
| `washer2@laundry.com` | `NhanVien@123` | Washer |

---

## File đã thay đổi

```
laundry-be/
├── Procfile                          (THÊM)
├── DEPLOY_RAILWAY_GUIDE.md           (THÊM)
├── DEPLOYMENT_SUMMARY.md             (THÊM)
├── prisma.config.ts                  (SỬA: env → process.env)
├── tsconfig.json                     (SỬA: rootDir, module, incremental)
├── tsconfig.build.json               (SỬA: exclude prisma)
├── .gitignore                        (SỬA: thêm compiled artifacts)
├── package.json                      (SỬA: build script)
├── .env                              (giữ nguyên, dùng làm mẫu)
├── prisma/
│   └── fix-customer-password.ts      (THÊM)
├── src/auth/dto/
│   └── register.dto.ts               (SỬA: phone regex)
└── src/main.ts                       (giữ nguyên - CORS đã đúng)
```

---

## URL Production

- **Backend API:** `https://web-production-6f589.up.railway.app`
- **Health check:** `GET /auth/me` → trả về 401 (có token mới được)
