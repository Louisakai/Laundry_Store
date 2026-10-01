# Auto-Assign Shipper — Frontend + GPS Tracking

## 1. File thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useAdmin.ts` | Thêm `useAutoAssignShipper()` hook |
| `src/hooks/useStaff.ts` | Thêm `useLocationTracker()` hook + import `useRef`, `useEffect` |
| `src/app/admin/orders/[id]/page.tsx` | Thêm nút "Tự động gán" |
| `src/app/staff/layout.tsx` | Gọi `useLocationTracker()` cho shipper đang trong ca |
| `src/components/addresses/MapPicker.tsx` | Fix container hidden → map không render |

---

## 2. `useAutoAssignShipper()`

Hook gọi `POST /orders/:id/auto-assign`.

```typescript
const autoAssign = useAutoAssignShipper();
await autoAssign.mutateAsync(orderId);
```

Tự động invalidate các query: `admin-orders`, `admin-stats`, `orders`.

---

## 3. Nút "Tự động gán"

**Vị trí:** `src/app/admin/orders/[id]/page.tsx`

- Button variant `secondary`, icon `<Truck>`
- Xuất hiện bên dưới nút "Gán shipper" thủ công
- Disabled khi đang gán (`isAssigning`)
- Toast success / error

---

## 4. `useLocationTracker(enabled)`

### Mục đích

Theo dõi GPS shipper nền — gửi vị trí lên server định kỳ.

### Hoạt động

```
useLocationTracker(enabled)
│
├── enabled = true (shipper đang trong ca)
│
├── Gửi GPS ngay lập tức
│     └── navigator.geolocation.getCurrentPosition()
│
├── setInterval mỗi 2 phút → gửi GPS
│     └── Chỉ gửi nếu vị trí thay đổi > 100m
│         (Math.abs(lat - lastLat) > 0.001)
│
└── Cleanup trên unmount
      └── clearInterval()
```

### Config
- `enableHighAccuracy: true`
- `timeout: 10000` (10 giây)
- `maximumAge: 60000` (chấp nhận cache 1 phút)
- Interval: 2 phút

### Kích hoạt

Trong `staff/layout.tsx`:

```typescript
useLocationTracker(user?.staffType === 'SHIPPER' && user?.isAvailable === true);
```

Chỉ chạy khi **SHIPPER** đang **trong ca**.

---

## 5. MapPicker Fix

### Vấn đề
Container map có `display: none` khi `useMapVina === false` → WebGL canvas không tính được kích thước → map init treo.

### Fix
- Dùng 1 container duy nhất, luôn `display: block`
- Try MapVina GL JS → fallback Leaflet/OSM trên cùng container
- Tách init logic khỏi vòng lặp re-render (dùng stable callback refs)
- CSS import tĩnh thay vì dynamic import
