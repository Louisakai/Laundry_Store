# PLAN — Fix & Refine sau Review (Tuần 7+)

> Approved ngày 14/07/2026

---

## A. CUSTOMER EXPERIENCE FIXES

### A1. WALKIN/DROP_OFF — Bỏ address, contact, time window

**Fix — Order creation form (`orders/new/page.tsx`):**

| Loại đơn | Address | Time + Contact |
|----------|---------|---------------|
| ONLINE | Pickup + Delivery (giữ) | Pickup window + Delivery window + Contact |
| WALKIN | **Bỏ qua** | **Chỉ notes** |
| DROP_OFF | Delivery (giữ) | Delivery window + Contact |

### A2. Bỏ quantity input cho ONLINE

- **ONLINE:** Chỉ checkbox chọn dịch vụ, **không input kg**. Giá tạm = `pricePerUnit`.
- **WALKIN/DROP_OFF:** Giữ nguyên input quantity (đã có đồ tại quầy).

### A3. MapPicker — Map4D (bản đồ Việt Nam) *(Làm sau)*

- Dùng **Map4D** (map.map4d.vn) — SDK React, free 50k req/tháng
- Click map → reverse geocoding → tự điền địa chỉ
- **Ẩn tọa độ** (vĩ độ/kinh độ) khỏi UI người dùng
- Cần `NEXT_PUBLIC_MAP4D_API_KEY`
- Fallback: giữ Leaflet nếu không có key, nhưng ẩn tọa độ

### A4. Time window picker — Giữ nguyên

---

## B. ADMIN FIXES

### B1. VALID_TRANSITIONS mới (theo loại đơn)

```
PENDING → [CONFIRMED, RECEIVED, CANCELLED]
CONFIRMED → [PICKING_UP, RECEIVED, CANCELLED]
PICKING_UP → [RECEIVED]
RECEIVED → [PROCESSING]
PROCESSING → [COMPLETED]
COMPLETED → [DELIVERING, DELIVERED]
DELIVERING → [DELIVERED]
```

**Flow theo loại đơn:**
- **ONLINE:** PENDING → CONFIRMED → PICKING_UP → RECEIVED → PROCESSING → COMPLETED → DELIVERING → DELIVERED
- **WALKIN:** PENDING → RECEIVED → PROCESSING → COMPLETED → DELIVERED (bỏ CONFIRMED, PICKING_UP, DELIVERING)
- **DROP_OFF:** PENDING → CONFIRMED → RECEIVED → PROCESSING → COMPLETED → DELIVERING → DELIVERED

### B2. Admin — Thêm service, điều chỉnh giá *(Làm sau)*

- `PATCH /admin/orders/:id/services` — thêm/xóa service, sửa quantity
- `PATCH /admin/orders/:id/price` — điều chỉnh totalPrice
- UI: card "Dịch vụ" có thể edit inline + nút "Lưu"

---

## C. STAFF/WASHER FIXES

### C1. Gán nhân viên — Chỉ admin gán shipper, washer auto

- **WALKIN/DROP_OFF:** washer = staff tạo đơn (auto)
- **ONLINE:** auto-gán washer available (1 washer/ca)
- **Shipper:** admin gán thủ công (UI riêng, chỉ hiện SHIPPER role)
- *Future: auto-gán shipper gần nhất*

### C2. Cân kg — Bắt buộc trước PROCESSING

- Staff order detail (`RECEIVED`): form "Cân đồ"
  - Input quantity kg cho từng service
  - Tính subtotal + tổng tiền tự động
  - Nút "Xác nhận cân" → `PATCH /orders/:id/weigh`
  - Sau cân mới hiện "Bắt đầu giặt"

### C3. Washer dashboard — Filter tabs

- Tab "Chờ giặt" (RECEIVED), "Đang giặt" (PROCESSING), "Đã giặt" (COMPLETED)

### C4. Payment — Xác nhận thủ công

**Cash:**
- Modal: hiển thị `totalPrice`, input "Số tiền nhận được" (mặc định = totalPrice)
- Auto tính tiền thừa
- `POST /orders/:id/complete-delivery` với `{ amountReceived }`

**QR/Bank:**
- Nút "Đã nhận được chuyển khoản" → payment SUCCESS

---

## D. SHIPPER FIXES

### D1 + D2. GPS — Store lúc 8h, auto-update sau mỗi lần xong việc

- **8h sáng (bắt đầu ca):** auto set GPS = store (`.env`: `STORE_LAT`, `STORE_LNG`, mặc định 10.03, 105.77)
- **PICKING_UP → RECEIVED:** GPS = store (đã bỏ đồ ở tiệm, sẵn sàng cho pickup tiếp theo)
- **DELIVERING → DELIVERED:** GPS = vị trí hiện tại (sẵn sàng cho pickup/giao kế tiếp)
- **Bỏ nút "Cập nhật GPS" thủ công**
- **Batch pickup (tương lai):** Gom nhiều pickup cùng khu vực là tính năng riêng, cần route optimization

---

## E. OTHER

### E1. Washer — Bỏ GPS

- Washer không dùng `currentLat/Lng`
- `PATCH /staff/location` chỉ SHIPPER

---

## F. THỨ TỰ ƯU TIÊN

| Mức | Tính năng |
|-----|-----------|
| **Phải làm** | A1 (WALKIN bỏ address/time), B1 (Fix status transitions), C2 (Cân bắt buộc), C4 (Payment confirm) |
| **Nên làm** | A2 (Bỏ quantity ONLINE), C1 (Tách gán shipper/washer), D1+D2 (GPS flow) |
| **Sau** | A3 (Map4D), B2 (Sửa giá/dịch vụ) |
| **Khi có time** | Landing page |

---

## G. THẢO LUẬN BỔ SUNG

### Gán shipper gần nhất (Future)
- Auto-gán đơn cho shipper gần vị trí pickup nhất
- Dùng GPS đã cập nhật sau RECEIVED/DELIVERED

### Batch pickup (tối ưu nhiều đơn cùng khu vực)
- Khi admin gán shipper cho đơn CONFIRMED, hệ thống tìm đơn PENDING/CONFIRMED khác trong bán kính ~2km
- Admin có thể chọn multiple orders → gán batch cho 1 shipper
- Shipper pickup hết 1 lượt → về tiệm → RECEIVED cả batch cùng lúc
- **Tạm gác lại**, hiện tại 1 shipper 1 đơn
