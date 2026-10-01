'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { useServices } from '@/hooks/useServices';
import { useAddresses, useCreateAddress } from '@/hooks/useAddresses';
import { useCreateOrder } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PresetTimePicker } from '@/components/orders/PresetTimePicker';
import { MapPicker } from '@/components/addresses/MapPicker';
import { formatCurrency } from '@/lib/utils';
import { OrderType as OrderTypeEnum } from '@/types';
import { ArrowLeft, ArrowRight, Check, ShoppingBag, Store, Truck } from 'lucide-react';
import { toast } from 'sonner';

const typeOptions = [
  { value: OrderTypeEnum.ONLINE, label: 'Lấy tận nơi - Giao tận nhà', icon: Truck, desc: 'Nhân viên đến lấy đồ và giao tận nhà' },
  { value: OrderTypeEnum.WALKIN, label: 'Mang đến tiệm - Tự đến lấy', icon: Store, desc: 'Tự mang đồ đến tiệm và tự đến lấy' },
  { value: OrderTypeEnum.DROP_OFF, label: 'Mang đến tiệm - Giao tận nhà', icon: ShoppingBag, desc: 'Mang đồ đến tiệm, nhân viên giao về' },
];

export default function CreateOrderPage() {
  const router = useRouter();
  const store = useOrderStore();
  const { user } = useAuthStore();

  const availableTypes = typeOptions.filter(
    (t) =>
      user?.role === 'STAFF' || user?.role === 'ADMIN'
        ? t.value !== OrderTypeEnum.ONLINE
        : true,
  );
  const { data: services } = useServices();
  const { data: addresses } = useAddresses();
  const createAddress = useCreateAddress();
  const createMutation = useCreateOrder();
  const [submitting, setSubmitting] = useState(false);
  const [showInlineAddress, setShowInlineAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [inlineAddress, setInlineAddress] = useState({
    label: '',
    addressLine: '',
    detail: '',
    latitude: 10.03,
    longitude: 105.77,
  });

  const handleSaveInlineAddress = async () => {
    if (!inlineAddress.addressLine.trim()) {
      toast.error('Vui lòng chọn vị trí trên bản đồ');
      return;
    }
    setSavingAddress(true);
    try {
      const fullAddress = inlineAddress.detail.trim()
        ? `${inlineAddress.detail.trim()}, ${inlineAddress.addressLine.trim()}`
        : inlineAddress.addressLine.trim();
      const addr = await createAddress.mutateAsync({
        label: inlineAddress.label.trim() || 'Địa chỉ giao',
        addressLine: fullAddress,
        latitude: inlineAddress.latitude,
        longitude: inlineAddress.longitude,
        owner:
          user?.role === 'STAFF' || user?.role === 'ADMIN' ? 'store' : undefined,
      });
      store.setDeliveryAddressId(addr.id);
      if (store.orderType === OrderTypeEnum.DROP_OFF) store.setStep(4);
      setShowInlineAddress(false);
      toast.success('Đã thêm địa chỉ giao');
    } catch {
      toast.error('Không thể lưu địa chỉ');
    } finally {
      setSavingAddress(false);
    }
  };

  const defaultAddress = addresses?.find((a) => a.isDefault);

  useEffect(() => {
    if (!addresses?.length || store.step !== 3) return;
    if (!defaultAddress) return;

    if (!store.deliveryAddressId) {
      store.setDeliveryAddressId(defaultAddress.id);
    }
    if (store.orderType === OrderTypeEnum.ONLINE && !store.pickupAddressId) {
      store.setPickupAddressId(defaultAddress.id);
    }
  }, [addresses, store.step, store.orderType, defaultAddress]);

  useEffect(() => {
    if (store.step !== 4 || !user) return;

    if (
      user?.role === 'CUSTOMER' &&
      !store.pickupContactName &&
      !store.pickupContactPhone &&
      !store.deliveryContactName &&
      !store.deliveryContactPhone
    ) {
      store.setContact('pickupContactName', user.fullName);
      store.setContact('pickupContactPhone', user.phone);
      store.setContact('deliveryContactName', user.fullName);
      store.setContact('deliveryContactPhone', user.phone);
    }
  }, [store.step, user]);

  const isWalkin = store.orderType === OrderTypeEnum.WALKIN;

  function validateTimeWindows(): string | null {
    const { pickupWindowStart, pickupWindowEnd, deliveryWindowStart, deliveryWindowEnd } = store;

    const now = Date.now();
    const buffer = 5 * 60 * 1000;

    if (pickupWindowStart && new Date(pickupWindowStart).getTime() < now - buffer) {
      return 'Thời gian lấy đồ không thể ở quá khứ';
    }
    if (deliveryWindowStart && new Date(deliveryWindowStart).getTime() < now - buffer) {
      return 'Thời gian giao đồ không thể ở quá khứ';
    }

    if (!pickupWindowEnd || !deliveryWindowStart || !deliveryWindowEnd) return null;

    const pEnd = new Date(pickupWindowEnd).getTime();
    const dStart = new Date(deliveryWindowStart).getTime();
    const dEnd = new Date(deliveryWindowEnd).getTime();

    if (dStart <= pEnd) return 'Thời gian giao đồ phải sau thời gian lấy đồ';

    const sixHours = 6 * 60 * 60 * 1000;
    if (dStart - pEnd < sixHours) return 'Khoảng cách giữa lấy đồ và giao đồ tối thiểu 6 tiếng';

    const endH = new Date(deliveryWindowEnd).getHours();
    const endM = new Date(deliveryWindowEnd).getMinutes();
    if (endH > 22 || (endH === 22 && endM > 0)) return 'Khung giờ giao đồ không được sau 22:00';

    return null;
  }

  const earliestDeliveryTime = store.pickupWindowEnd
    ? new Date(new Date(store.pickupWindowEnd).getTime() + 6 * 60 * 60 * 1000).toISOString()
    : null;

  const handleNext = () => {
    if (isWalkin && store.step === 2) {
      store.setStep(4);
    } else {
      store.setStep(store.step + 1);
    }
  };
  const handleBack = () => {
    if (isWalkin && store.step === 4) {
      store.setStep(2);
    } else {
      store.setStep(store.step - 1);
    }
  };

  const handleSubmit = async () => {
    const validationError = validateTimeWindows();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        orderType: store.orderType,
        items: store.items.map((i) => ({ serviceId: i.serviceId })),
      };
      if (store.deliveryAddressId) payload.deliveryAddressId = store.deliveryAddressId;
      if (store.pickupAddressId) payload.pickupAddressId = store.pickupAddressId;
      if (store.pickupWindowStart) payload.pickupWindowStart = store.pickupWindowStart;
      if (store.pickupWindowEnd) payload.pickupWindowEnd = store.pickupWindowEnd;
      if (store.deliveryWindowStart) payload.deliveryWindowStart = store.deliveryWindowStart;
      if (store.deliveryWindowEnd) payload.deliveryWindowEnd = store.deliveryWindowEnd;
      if (store.pickupContactName) payload.pickupContactName = store.pickupContactName;
      if (store.pickupContactPhone) payload.pickupContactPhone = store.pickupContactPhone;
      if (store.deliveryContactName) payload.deliveryContactName = store.deliveryContactName;
      if (store.deliveryContactPhone) payload.deliveryContactPhone = store.deliveryContactPhone;
      if (store.notes) payload.notes = store.notes;

      const order = await createMutation.mutateAsync(payload as never);
      store.reset();
      toast.success('Đặt đơn thành công!');
      router.push(user?.role === 'STAFF' || user?.role === 'ADMIN' ? `/admin/orders/${order.id}` : `/orders/${order.id}`);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message;
      toast.error(msg || 'Đặt đơn thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const activeServices = services?.filter((s) => s.isActive) || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].filter((s) => !isWalkin || s !== 3).map((s, idx, arr) => {
          const displayNum = isWalkin && s === 4 ? 3 : s;
          const internalStep = isWalkin && s === 4 ? 4 : s;
          const completed = internalStep < store.step;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                internalStep <= store.step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>{completed ? <Check className="h-4 w-4" /> : displayNum}</div>
              {idx < arr.length - 1 && <div className={`h-0.5 w-8 ${internalStep < store.step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          );
        })}
      </div>

      <h1 className="text-2xl font-bold">Tạo đơn hàng mới</h1>

      {store.step === 1 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Chọn hình thức đặt đơn phù hợp với bạn</p>
          <div className="grid gap-3">
            {availableTypes.map((opt) => (
              <Card key={opt.value} className={`cursor-pointer hover:shadow-md transition-all ${
                store.orderType === opt.value ? 'ring-2 ring-primary' : ''
              }`} onClick={() => store.setOrderType(opt.value)}>
                <CardContent className="flex items-center gap-4 p-4">
                  <opt.icon className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {store.step === 2 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Chọn dịch vụ (số kg sẽ được cân tại tiệm)</p>

          <div className="grid gap-3">
            {activeServices.map((svc) => {
              const selected = store.items.some((i) => i.serviceId === svc.id);
              return (
                <Card key={svc.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    if (selected) {
                      store.removeItem(svc.id);
                    } else {
                      store.addItem({ serviceId: svc.id, name: svc.name, quantity: 1, price: svc.pricePerUnit, unit: svc.unit });
                    }
                  }}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{svc.name}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(svc.pricePerUnit)} /{svc.unit}</p>
                    </div>
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                      selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                    }`}>
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {store.items.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="space-y-1">
                  {store.items.map((item) => (
                    <div key={item.serviceId} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.price)} / {item.unit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {store.step === 3 && store.orderType !== OrderTypeEnum.WALKIN && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Chọn địa chỉ giao hàng</p>

          <div className="flex items-center justify-between">
            <Label>Địa chỉ giao hàng</Label>
            {!store.deliveryAddressId && (
              <Button variant="outline" size="sm" onClick={() => setShowInlineAddress((v) => !v)}>
                {showInlineAddress ? 'Huỷ' : '+ Thêm địa chỉ'}
              </Button>
            )}
          </div>
          {showInlineAddress && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Input
                  placeholder="Tên địa chỉ (VD: Nhà khách, Quán cà phê...)"
                  value={inlineAddress.label}
                  onChange={(e) => setInlineAddress((p) => ({ ...p, label: e.target.value }))}
                />
                <MapPicker
                  latitude={inlineAddress.latitude}
                  longitude={inlineAddress.longitude}
                  onLocationChange={(lat, lng) => setInlineAddress((p) => ({ ...p, latitude: lat, longitude: lng }))}
                  onAddressResolve={(addr) => setInlineAddress((p) => ({ ...p, addressLine: addr }))}
                />
                <Input
                  placeholder="Số nhà / chi tiết địa chỉ"
                  value={inlineAddress.detail}
                  onChange={(e) => setInlineAddress((p) => ({ ...p, detail: e.target.value }))}
                />
                <Button size="sm" onClick={handleSaveInlineAddress} disabled={savingAddress}>
                  {savingAddress ? 'Đang lưu...' : 'Lưu và dùng địa chỉ này'}
                </Button>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-2">
            {addresses?.map((addr) => (
              <Card key={addr.id} className={`cursor-pointer hover:shadow-md ${
                store.deliveryAddressId === addr.id ? 'ring-2 ring-primary' : ''
              }`} onClick={() => {
                store.setDeliveryAddressId(addr.id);
                if (store.orderType === OrderTypeEnum.DROP_OFF) store.setStep(4);
              }}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm flex items-center gap-2">
                      {addr.label}
                      {addr.isDefault && <Badge variant="secondary" className="text-xs">Mặc định</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">{addr.addressLine}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {store.orderType === OrderTypeEnum.ONLINE && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Địa chỉ lấy đồ</Label>
                {!store.pickupAddressId && (
                  <Button variant="outline" size="sm" asChild>
                    <a href="/addresses/new">+ Thêm địa chỉ</a>
                  </Button>
                )}
              </div>
              <div className="grid gap-2">
                {addresses?.map((addr) => (
                  <Card key={addr.id} className={`cursor-pointer hover:shadow-md ${
                    store.pickupAddressId === addr.id ? 'ring-2 ring-primary' : ''
                  }`} onClick={() => store.setPickupAddressId(addr.id)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm flex items-center gap-2">
                          {addr.label}
                          {addr.isDefault && <Badge variant="secondary" className="text-xs">Mặc định</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">{addr.addressLine}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {store.step === 4 && (
        <div className="space-y-6">
          <p className="text-muted-foreground">Thông tin thời gian và liên hệ</p>

          {store.orderType === OrderTypeEnum.ONLINE && (
            <>
              <PresetTimePicker
                label="Khung giờ lấy đồ"
                onSelect={(s, e) => store.setPickupWindow(s, e)}
                value={{ start: store.pickupWindowStart, end: store.pickupWindowEnd }}
                dynamicToday
              />
              <PresetTimePicker
                label="Khung giờ giao đồ"
                onSelect={(s, e) => store.setDeliveryWindow(s, e)}
                value={{ start: store.deliveryWindowStart, end: store.deliveryWindowEnd }}
                earliestTime={earliestDeliveryTime}
              />
            </>
          )}

          {store.orderType === OrderTypeEnum.DROP_OFF && (
            <PresetTimePicker
              label="Khung giờ giao đồ"
              onSelect={(s, e) => store.setDeliveryWindow(s, e)}
              value={{ start: store.deliveryWindowStart, end: store.deliveryWindowEnd }}
              earliestTime={earliestDeliveryTime}
            />
          )}

          {store.orderType !== OrderTypeEnum.WALKIN && (
            <>
              <p className="text-xs text-red-500 italic">
                * Cần tối thiểu 6 tiếng để giặt và xử lý đơn hàng, cảm ơn bạn đã thông cảm
              </p>
              <Separator />
              {store.orderType === OrderTypeEnum.ONLINE && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tên người liên hệ (lấy đồ)</Label>
                    <Input placeholder="Tên của bạn" value={store.pickupContactName} onChange={(e) => store.setContact('pickupContactName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>SĐT liên hệ (lấy đồ)</Label>
                    <Input placeholder="0912345678" value={store.pickupContactPhone} onChange={(e) => store.setContact('pickupContactPhone', e.target.value)} />
                  </div>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tên người nhận</Label>
                  <Input placeholder="Tên người nhận" value={store.deliveryContactName} onChange={(e) => store.setContact('deliveryContactName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>SĐT người nhận</Label>
                  <Input placeholder="0912345678" value={store.deliveryContactPhone} onChange={(e) => store.setContact('deliveryContactPhone', e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea placeholder="Ghi chú thêm cho đơn hàng..." value={store.notes} onChange={(e) => store.setNotes(e.target.value)} />
          </div>

          {store.items.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="space-y-1">
                  {store.items.map((item) => (
                    <div key={item.serviceId} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.price)} / {item.unit}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Tổng cộng</span>
                    <span>{formatCurrency(0)} (sẽ tính sau khi cân)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex justify-between">
        {store.step > 1 ? (
          <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Quay lại</Button>
        ) : <div />}
        {store.step < 4 ? (
          <Button onClick={handleNext} disabled={
            (store.step === 1 && !store.orderType) ||
            (store.step === 2 && store.items.length === 0) ||
            (store.step === 3 && store.orderType === OrderTypeEnum.ONLINE && (!store.pickupAddressId || !store.deliveryAddressId)) ||
            (store.step === 3 && store.orderType === OrderTypeEnum.DROP_OFF && !store.deliveryAddressId)
          }>Tiếp theo <ArrowRight className="ml-2 h-4 w-4" /></Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || !!validateTimeWindows()}>
            {submitting ? 'Đang xử lý...' : 'Xác nhận đặt đơn'}
          </Button>
        )}
      </div>
    </div>
  );
}
