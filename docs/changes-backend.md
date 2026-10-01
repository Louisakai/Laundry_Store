# Backend Changes — Tuần 7 Review Fix

## 1. Order Creation — Không require quantity (service.ts)

**File:** `laundry-be/src/order/order.service.ts`

- Bỏ validate `quantity > 0` cho WALKIN và DROP_OFF
- Tất cả order items được tạo với `quantity: null, subtotal: null`
- Giá tạm thời = 0, sẽ tính sau khi cân

## 2. VALID_TRANSITIONS + ORDER_TYPE_FLOWS (service.ts)

**File:** `laundry-be/src/order/order.service.ts`

```typescript
PENDING → [CONFIRMED, RECEIVED, CANCELLED]
CONFIRMED → [PICKING_UP, RECEIVED, CANCELLED]
PICKING_UP → [RECEIVED]
RECEIVED → [PROCESSING]
PROCESSING → [COMPLETED]
COMPLETED → [DELIVERING, DELIVERED]
DELIVERING → [DELIVERED]
```

- Thêm `RECEIVED` vào PENDING transitions
- Thêm `DELIVERED` vào COMPLETED transitions
- Thêm `ORDER_TYPE_FLOWS` — kiểm tra luồng theo từng loại đơn:
  - **ONLINE:** PENDING → CONFIRMED → PICKING_UP → RECEIVED → PROCESSING → COMPLETED → DELIVERING → DELIVERED
  - **WALKIN:** PENDING → RECEIVED → PROCESSING → COMPLETED → DELIVERED
  - **DROP_OFF:** PENDING → CONFIRMED → RECEIVED → PROCESSING → COMPLETED → DELIVERING → DELIVERED
- Xoá WALKIN-specific checks (PICKING_UP/DELIVERING), thay bằng ORDER_TYPE_FLOWS

## 3. Weigh — Cho phép cân ở RECEIVED (service.ts)

**File:** `laundry-be/src/order/order.service.ts`

- `weighOrder()` nhận thêm `OrderStatus.RECEIVED` (ngoài PENDING, CONFIRMED)
- Nếu đã ở RECEIVED → chỉ update quantity, không đổi status
- Nếu PENDING/CONFIRMED → update + chuyển sang RECEIVED

## 4. Enforce cân trước PROCESSING (service.ts)

**File:** `laundry-be/src/order/order.service.ts`

- Transition `→ PROCESSING` yêu cầu **tất cả order items** phải có `quantity != null`
- Áp dụng cho **mọi loại đơn** (không chỉ ONLINE như trước)

## 5. Payment — `amountReceived` + `providerOverride` (service.ts, payment.service.ts)

**File:** `laundry-be/src/order/order.service.ts`
**File:** `laundry-be/src/payment/payment.service.ts`

- `completeDelivery()` nhận thêm `amountReceived?: number` và `providerOverride?: string`
- `processPayment()` dùng `providerOverride ?? order.paymentMethod` để quyết định CASH/PAYOS
- CASH: ghi log tiền thừa nếu `amountReceived > totalPrice`
- PAYOS: fallback sang test URL nếu chưa có `PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY`

## 6. Confirm Payment (service.ts)

**File:** `laundry-be/src/order/order.service.ts`

- `confirmPayment(id, userId)`: tìm payment PENDING → set SUCCESS + paidAt
- Cập nhật `order.paymentStatus = SUCCESS`
- Tạo tracking log + notification

## 7. Controller — Routes mới (controller.ts)

**File:** `laundry-be/src/order/order.controller.ts`

- `POST /orders/:id/confirm-payment` — xác nhận thanh toán thủ công
- `POST /orders/:id/complete-delivery` — nhận thêm body `{ amountReceived, provider }`

## 8. Pay Module — QR test page (controller.ts)

**File:** `laundry-be/src/pay/pay.controller.ts`
**File:** `laundry-be/src/pay/pay.module.ts`
**File:** `laundry-be/src/app.module.ts` — import PayModule

- `GET /pay/:id` — trả HTML trang xác nhận thanh toán
  - Hiển thị thông tin đơn + tổng tiền
  - Nút "Xác nhận đã thanh toán"
  - Sau confirm: tick xanh + "Thanh toán thành công"
- `POST /pay/:id/confirm` — xác nhận payment (không cần auth, test mode)

## Files changed

| File | Changes |
|------|---------|
| `laundry-be/src/order/order.service.ts` | Transitions, weigh, payment flow |
| `laundry-be/src/order/order.controller.ts` | New routes, updated params |
| `laundry-be/src/order/order.controller.spec.ts` | Updated test params |
| `laundry-be/src/payment/payment.service.ts` | providerOverride, amountReceived, PayOS fallback |
| `laundry-be/src/pay/pay.controller.ts` | New: QR test page |
| `laundry-be/src/pay/pay.module.ts` | New: pay module |
| `laundry-be/src/app.module.ts` | Import PayModule |
