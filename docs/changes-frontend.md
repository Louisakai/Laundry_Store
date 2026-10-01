# Frontend Changes — Tuần 7 Review Fix

## A1 — Order Creation Form

**File:** `laundry-fe/src/app/(dashboard)/orders/new/page.tsx`

### Step 3 (Address) — WALKIN skip, DROP_OFF chỉ delivery
- WALKIN: **bỏ qua step 3** — `handleNext` nhảy từ step 2 → 4
- DROP_OFF: chỉ hiển thị delivery address (bỏ pickup)
- ONLINE: giữ pickup + delivery

### Step 4 (Time/Contact) — WALKIN chỉ notes
- WALKIN: chỉ hiển thị ghi chú + tổng tiền
- DROP_OFF: delivery time + delivery contact + notes
- ONLINE: pickup + delivery time + contacts + notes

### Step indicator
- WALKIN: hiển thị 3 bước [1] [2] [3] (bước 3 là xác nhận)
- ONLINE/DROP_OFF: 4 bước [1] [2] [3] [4]

**File:** `laundry-fe/src/stores/orderStore.ts`
- `setOrderType` — reset address/window/contact fields khi chuyển loại đơn

## A1 Extended — Service Selection

**File:** `laundry-fe/src/app/(dashboard)/orders/new/page.tsx`

- **Card toggle** thay cho +- buttons + input quantity
- Click chọn/bỏ chọn service
- Checkbox hiển thị bên phải card
- Không input số lượng (sẽ cân tại tiệm)
- Tổng tiền ở confirmation: `(sẽ tính sau khi cân)`
- Submit không gửi `quantity`

## B1 — Status Transitions per Order Type

**File:** `laundry-fe/src/app/staff/orders/[id]/page.tsx`

- `getStaffActions()` — trả về actions phù hợp với `order.orderType`
- WALKIN: CONFIRMED → (skip), COMPLETED → DELIVERED
- DROP_OFF: giống ONLINE (có PICKING_UP, DELIVERING)
- ONLINE: đầy đủ

**File:** `laundry-fe/src/app/admin/orders/[id]/page.tsx`

- `getStatusActions()` — tương tự cho admin
- WALKIN: PENDING → RECEIVED, COMPLETED → DELIVERED

## C2 — Weigh Form

**File:** `laundry-fe/src/app/staff/orders/[id]/page.tsx`

- Khi `status === 'RECEIVED'` và item có `quantity === null`:
  - Hiển thị form cân: input kg cho từng service, preview tổng tiền
  - Nút "Xác nhận cân" → `PATCH /orders/:id/weigh`
  - Sau cân → hiện "Bắt đầu giặt"
- Khi đã cân xong → action buttons bình thường

**File:** `laundry-fe/src/app/admin/orders/[id]/page.tsx`

- Admin page cũng có weigh form tương tự

**File:** `laundry-fe/src/hooks/useOrders.ts`

- Thêm `useWeighOrder()` hook

## C4 — Payment (Unified Flow)

**File:** `laundry-fe/src/app/staff/orders/[id]/page.tsx`

### COMPLETED status
- Một nút **"Thanh toán"** duy nhất (thay vì "Đã giao" + "Thu tiền")
- Click → modal chọn phương thức:
  - **Tiền mặt** → auto DELIVERED + PAID (gọi `completeDelivery('CASH')`)
  - **Chuyển khoản** → tạo PAYOS link/test URL → QR modal

### QR Modal
- Hiển thị QR code từ `api.qrserver.com`
- 3 nút: "Đóng", "Mở trang thanh toán", "Đã nhận được chuyển khoản"
- "Đã nhận được chuyển khoản" → gọi `confirmPayment()`

**File:** `laundry-fe/src/app/admin/orders/[id]/page.tsx`
- Admin page có cùng unified payment flow + QR modal

**File:** `laundry-fe/src/hooks/useOrders.ts`
- Thêm `useConfirmPayment()` hook
- `useCompleteDelivery()` nhận `{ id, amountReceived, provider }`

## Pay Test Page (removed)

**File:** `laundry-fe/src/app/pay/[id]/page.tsx` — **đã xoá**
- Chuyển sang backend `GET /pay/:id` (NestJS trả HTML)

## Files changed

| File | Changes |
|------|---------|
| `laundry-fe/src/app/(dashboard)/orders/new/page.tsx` | A1: address/time skip, service toggle |
| `laundry-fe/src/stores/orderStore.ts` | Reset fields on type change |
| `laundry-fe/src/app/staff/orders/[id]/page.tsx` | B1, C2, C4: weigh form, payment flow |
| `laundry-fe/src/app/admin/orders/[id]/page.tsx` | B1, C2, C4: weigh form, payment flow |
| `laundry-fe/src/hooks/useOrders.ts` | Weigh, confirm payment hooks |
| `laundry-fe/src/types/index.ts` | (no changes) |
