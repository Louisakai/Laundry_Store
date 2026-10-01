# Auto-Assign Shipper — Backend

## 1. Mục đích

Tự động tìm và gán shipper phù hợp nhất cho đơn hàng dựa trên khoảng cách thực tế và khối lượng công việc hiện tại.

---

## 2. File thay đổi

| File | Thay đổi |
|------|----------|
| `src/order/order.service.ts` | Thêm `autoAssignShipper()`, `haversine()`, trigger trong `updateStatus()` |
| `src/order/order.controller.ts` | Thêm `POST /orders/:id/auto-assign` |

---

## 3. Scoring Formula

```
totalScore = 0.7 × distanceScore + 0.3 × workloadScore
```

| Yếu tố | Trọng số | Cách tính |
|--------|----------|-----------|
| **distanceScore** | 70% | `1 - distance / maxDistance` — shipper gần nhất được 1.0 |
| **workloadScore** | 30% | `1 - activeOrders / maxWorkload` — shipper ít đơn nhất được 1.0 |

- `maxDistance`: khoảng cách xa nhất trong danh sách shipper (tối thiểu 0.001 để tránh chia 0)
- `maxWorkload`: số đơn active nhiều nhất (tối thiểu 1)
- `activeOrders`: đơn có status không thuộc `[DELIVERED, CANCELLED]`

---

## 4. `autoAssignShipper(orderId, userId)`

### Luồng xử lý

```
autoAssignShipper(id, userId)
│
├── 1. Fetch order + pickupAddress + deliveryAddress + staff
├── 2. Kiểm tra status: CONFIRMED / COMPLETED / DELIVERING
├── 3. Kiểm tra chưa có SHIPPER (cho phép nếu đang là WASHER)
├── 4. Xác định target address:
│     ├── CONFIRMED   → pickupAddress (shipper đi lấy)
│     └── COMPLETED / DELIVERING → deliveryAddress (shipper đi giao)
│
├── 5. Fetch available shippers (isAvailable = true)
├── 6. Fetch activeOrderCount cho từng shipper (groupBy staff_id)
├── 7. Tính score cho từng shipper
├── 8. Chọn shipper có score cao nhất
├── 9. Gọi assignStaff(orderId, bestShipper.id, userId)
│
└── 10. Nếu CONFIRMED + ONLINE → tự động chuyển status → PICKING_UP
```

---

## 5. Trigger tự động trong `updateStatus()`

| Status chuyển đến | ONLINE | DROP_OFF | WALKIN |
|-------------------|--------|----------|--------|
| **CONFIRMED** | ✅ Gán shipper + chuyển PICKING_UP | ❌ Bỏ qua | ❌ Bỏ qua |
| **COMPLETED** | ✅ Gán nếu chưa có shipper | ✅ Gán nếu chưa có shipper | ✅ Gán nếu chưa có shipper |
| **DELIVERING** | ✅ Gán nếu chưa có shipper | ✅ Gán nếu chưa có shipper | — |

- Trigger chỉ chạy khi `isShipperAssigned === false`
- Nếu auto-assign thất bại (không có shipper), status vẫn được chuyển — không block

---

## 6. `assignStaff()` — Mở rộng status cho phép

Thêm `DELIVERING` vào danh sách status hợp lệ:

```typescript
order.status !== CONFIRMED &&
order.status !== COMPLETED &&
order.status !== DELIVERING  // ← thêm
```

---

## 7. `POST /orders/:id/auto-assign`

Endpoint cho admin bấm thủ công.

- **Method:** POST
- **Auth:** ADMIN
- **Body:** không (tự động tìm shipper)
- **Response:** kết quả gán shipper

---

## 8. Haversine (khoảng cách địa lý)

```typescript
haversine(lat1, lng1, lat2, lng2) → distance (km)
```

Công thức great-circle distance dùng bán kính Trái Đất R = 6371 km.
