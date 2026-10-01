# Hướng dẫn Deploy Backend lên Railway (Chi tiết từng bước)

## Bước 0 — Chuẩn bị

- Tài khoản GitHub (đã có)
- Code backend đã push lên GitHub repo (ví dụ: `laundry-be`)

---

## Bước 1 — Tạo file Procfile

Vào thư mục `laundry-be/`, tạo file **`Procfile`** (không có đuôi, không phải `Procfile.txt`) với nội dung:

```
web: node dist/main
```

> **Giải thích:** Railway dùng Procfile để biết command nào chạy web server. `dist/main` là file output sau khi build.

---

## Bước 2 — Đăng ký / Đăng nhập Railway

1. Vào https://railway.app
2. Click **Login with GitHub**
3. Cấp quyền cho Railway truy cập GitHub repo của bạn

---

## Bước 3 — Tạo Project & Kết nối GitHub

1. Dashboard Railway → click **New Project**
2. Chọn **Deploy from GitHub repo**
3. Chọn repo **`laundry-be`** (hoặc tên repo của bạn)
4. Railway tự động phát hiện là Node.js project

---

## Bước 4 — Cấu hình Build & Start

Sau khi kết nối, Railway tự detect. Kiểm tra ở tab **Settings**:

| Mục | Giá trị |
|---|---|
| Root Directory | _(để trống)_ |
| Build Command | `npm run build` |
| Start Command | _(để trống — Railway dùng Procfile)_ |

---

## Bước 5 — Thêm Environment Variables

Vào tab **Variables**, thêm từng biến sau:

### Database (Supabase)
```
DATABASE_URL=postgresql://postgres.lonnurszgtpyubxjzesz:Ch6m9VxY9xFluqTd@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.lonnurszgtpyubxjzesz:Ch6m9VxY9xFluqTd@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### JWT
```
JWT_SECRET=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
JWT_REFRESH_SECRET=f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4
JWT_ACCESS_EXPIRY=2h
JWT_REFRESH_EXPIRY=7d
```

### CORS & Env
```
CORS_ORIGIN=https://laundry-fe.vercel.app
NODE_ENV=production
```

### PayOS (nếu có — nếu chưa thì để trống)
```
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
PAYOS_RETURN_URL=https://laundry-fe.vercel.app/orders/payment-success
PAYOS_CANCEL_URL=https://laundry-fe.vercel.app/orders/payment-cancel
# BẮT BUỘC để tự cập nhật trạng thái khi khách chuyển khoản xong.
# Dùng đúng URL Railway của backend + đường dẫn webhook:
PAYOS_WEBHOOK_URL=https://laundry-be-production.up.railway.app/payments/payos-webhook
```

### Store Coordinates (mặc định)
```
STORE_LAT=10.03
STORE_LNG=105.77
```

> **Không thêm `PORT`** — Railway tự inject.

---

## Bước 6 — Deploy lần đầu

Sau khi thêm xong biến môi trường:

1. Railway sẽ tự động build và deploy
2. Vào tab **Deploy Logs** để theo dõi tiến trình
3. Nếu build thành công, bạn sẽ thấy **"Deploy succeeded"**

Nếu gặp lỗi:
- Kiểm tra **Deploy Logs** — lỗi cụ thể sẽ hiện ra
- Thường gặp: thiếu biến môi trường, hoặc lỗi build

---

## Bước 7 — Lấy URL

1. Vào tab **Settings** → **Networking**
2. Click **Generate Domain**
3. Đợi vài giây → Railway cấp URL dạng:
   ```
   https://laundry-be-production.up.railway.app
   ```
4. Copy URL này

---

## Bước 8 — Kiểm tra

Dùng browser hoặc Postman kiểm tra:

```
GET https://laundry-be-production.up.railway.app/auth/me
```

Nếu trả về `401 Unauthorized` (thay vì lỗi kết nối) là backend đã chạy thành công.

---

## Bước 9 — Update Frontend

Sau khi có URL backend, lên **Vercel Dashboard** set:

| Variable | Giá trị |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://laundry-be-production.up.railway.app` |

Rồi deploy lại frontend.

---

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| Build fail "Cannot find module" | Thiếu dependency | Kiểm tra `package.json`, `npm install` |
| 404 khi gọi API | Route sai hoặc chưa build | Kiểm tra log Railway |
| 502 Bad Gateway | Server crash | Xem Deploy Logs để biết lỗi cụ thể |
| CORS error trên frontend | `CORS_ORIGIN` chưa set đúng | Kiểm tra biến trên Railway |
| WebSocket không kết nối | Railway free plan có thể chặn WS | Thử thêm transport `polling` |
