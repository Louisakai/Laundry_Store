# Changes — 15/07/2026

Thực hiện A2, C1, D1+D2, A3, B2 theo `plan-tuan-7-review-fix.md`

---

## A2 — Bỏ quantity input cho ONLINE (Done)

**Trạng thái:** Đã xong từ trước, không cần sửa code.

Step 2 trong `orders/new/page.tsx` chỉ hiển thị checkbox chọn dịch vụ, không có input kg cho bất kỳ loại đơn nào. `handleSubmit` cũng không gửi quantity.

---

## C1 — Gán nhân viên (washer auto, shipper admin gán thủ công)

### Backend

**File:** `laundry-be/src/order/order.service.ts`

- **`create()` (dòng 140-155):** Auto-assign washer:
  - WALKIN/DROP_OFF: nếu creator là STAFF + WASHER, gán `staff_id = userId`
  - ONLINE: tìm `availableWasher` đầu tiên (isAvailable=true, order by locationUpdatedAt), gán làm staff
- **`assignStaff()` (dòng 405-464):** Chỉ nhận SHIPPER. Cho phép **thay washer → shipper** (khi `order.staff.staffType === 'WASHER'`). Validate status: CONFIRMED hoặc COMPLETED.

### Frontend

**File:** `laundry-fe/src/app/admin/orders/[id]/page.tsx`

- `useStaffList({ staffType: 'SHIPPER' })` — chỉ show shipper trong dropdown
- Card "Nhân viên": hiển thị washer đã auto-assign, chỉ gán shipper khi CONFIRMED/COMPLETED

---

## D1+D2 — GPS auto (store lúc 8h, auto-update sau mỗi lần xong việc)

### Backend

**File:** `laundry-be/src/order/order.service.ts`

- **`updateStatus()` (dòng 260-276):** Auto-update GPS khi chuyển trạng thái:
  - `PICKING_UP → RECEIVED` + staff là SHIPPER → GPS = `STORE_LAT/STORE_LNG` (từ env)
  - `DELIVERING → DELIVERED` + staff là SHIPPER → GPS = `dto.lat/dto.lng` (từ client) hoặc fallback store

**File:** `laundry-be/src/order/dto/update-order-status.dto.ts`

- Thêm `lat?: number`, `lng?: number` (optional)

**File:** `laundry-be/src/staff/staff.service.ts`

- **`updateLocation()`:** Thêm check `staffType === SHIPPER` — WASHER không dùng GPS (E1)
- **`setLocationToStore()`:** Method mới, set GPS = store coordinates

**File:** `laundry-be/src/staff/staff.controller.ts`

- Thêm `PATCH /staff/location/store` — gọi `setLocationToStore()`

**File:** `laundry-be/.env`

- Thêm `STORE_LAT=10.03`, `STORE_LNG=105.77`

### Frontend

**File:** `laundry-fe/src/app/staff/page.tsx`

- Xoá nút "Cập nhật GPS" thủ công
- Khi bấm "Bắt đầu ca" → toggle availability + auto call `PATCH /staff/location/store` (set GPS = store)

**File:** `laundry-fe/src/app/staff/orders/[id]/page.tsx`

- **`handleStatusUpdate()`:** Xoá auto-update location sau mọi status change (từng gọi `useUpdateLocation`)
- Khi update → **DELIVERED**: lấy GPS từ browser, gửi kèm `{ lat, lng }` trong payload

---

## A3 — MapPicker với Map4D (fallback Leaflet)

### Frontend

**File:** `laundry-fe/src/components/addresses/MapPicker.tsx` (full rewrite)

- **Map4D SDK** — load dynamic từ `https://api.map4d.vn/sdk/map/js?version=2.4&key={KEY}`
- Click map → reverse geocoding (Map4D) → tự điền địa chỉ vào ô tìm kiếm
- **Fallback Leaflet** — nếu `NEXT_PUBLIC_MAP4D_API_KEY` không có hoặc load thất bại
- **Ẩn tọa độ** — không hiển thị vĩ độ/kinh độ dưới map
- Dùng `nominatim` cho search khi fallback

**File:** `laundry-fe/.env.example`

- Thêm `NEXT_PUBLIC_MAP4D_API_KEY=`

---

## B2 — Admin sửa service & điều chỉnh giá

### Backend

**File:** `laundry-be/src/admin/admin.controller.ts`

- `PATCH /admin/orders/:id/services` — cập nhật quantity cho từng orderItem, tính lại totalPrice
- `PATCH /admin/orders/:id/price` — điều chỉnh totalPrice thủ công

**File:** `laundry-be/src/admin/admin.service.ts`

- **`updateOrderServices()`** — transaction: update quantity/subtotal từng item + tổng totalPrice
- **`updateOrderPrice()`** — validate price >= 0, update totalPrice

### Frontend

**File:** `laundry-fe/src/hooks/useAdmin.ts`

- **`useUpdateOrderServices()`** — mutation `PATCH /admin/orders/:id/services`
- **`useUpdateOrderPrice()`** — mutation `PATCH /admin/orders/:id/price`

**File:** `laundry-fe/src/app/admin/orders/[id]/page.tsx`

- Card "Dịch vụ": thêm nút **"Sửa"** → chuyển sang edit mode:
  - Input số lượng kg inline cho từng service
  - Auto tính subtotal theo quantity × price
  - "Điều chỉnh giá" — input riêng cho totalPrice
  - Nút **"Lưu thay đổi"** → gọi update services + price

---

## Files changed

### Backend (5 files)
| File | Task |
|------|------|
| `laundry-be/src/order/order.service.ts` | C1, D1+D2 |
| `laundry-be/src/order/dto/update-order-status.dto.ts` | D1+D2 |
| `laundry-be/src/staff/staff.service.ts` | D1+D2, E1 |
| `laundry-be/src/staff/staff.controller.ts` | D1+D2 |
| `laundry-be/src/admin/admin.controller.ts` | B2 |
| `laundry-be/src/admin/admin.service.ts` | B2 |
| `laundry-be/.env` | D1+D2 |

### Frontend (7 files)
| File | Task |
|------|------|
| `laundry-fe/src/components/addresses/MapPicker.tsx` | A3 |
| `laundry-fe/src/app/staff/page.tsx` | D1+D2 |
| `laundry-fe/src/app/staff/orders/[id]/page.tsx` | D1+D2 |
| `laundry-fe/src/app/admin/orders/[id]/page.tsx` | C1, B2 |
| `laundry-fe/src/hooks/useAdmin.ts` | B2 |
| `laundry-fe/src/hooks/useStaff.ts` | D1+D2 |
| `laundry-fe/.env.example` | A3 |
