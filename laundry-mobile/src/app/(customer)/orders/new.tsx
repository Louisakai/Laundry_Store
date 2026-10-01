import { useState } from 'react';
import { View, Alert, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { useCreateOrder } from '@/hooks/useOrders';
import { useAuthStore } from '@/stores/authStore';
import { useActiveServices } from '@/hooks/useServices';
import { useAddresses } from '@/hooks/useAddresses';
import { formatCurrency, orderTypeLabels } from '@/lib/utils';
import { getApiErrorMessage } from '@/api/client';
import { OrderType } from '@/types';

const STEPS = ['Loại đơn', 'Dịch vụ', 'Địa chỉ', 'Thời gian'];

const ORDER_TYPES: OrderType[] = [OrderType.ONLINE, OrderType.WALKIN, OrderType.DROP_OFF];

const TIME_SLOTS = [
  { label: 'Sáng (8-11h)', start: [8, 0], end: [11, 0] },
  { label: 'Trưa (11-14h)', start: [11, 0], end: [14, 0] },
  { label: 'Chiều (14-17h)', start: [14, 0], end: [17, 0] },
  { label: 'Tối (17-20h)', start: [17, 0], end: [20, 0] },
];

function toDate(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(year, month, day, hour, minute).toISOString();
}

export default function CreateOrderScreen() {
  const router = useRouter();
  const createOrder = useCreateOrder();
  const services = useActiveServices();
  const { data: addresses } = useAddresses();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(0);
  const [orderType, setOrderType] = useState<OrderType>(OrderType.ONLINE);
  const [selectedServices, setSelectedServices] = useState<Record<string, number>>({});
  const [pickupAddressId, setPickupAddressId] = useState<string | undefined>();
  const [deliveryAddressId, setDeliveryAddressId] = useState<string | undefined>();
  const [pickupDayOffset, setPickupDayOffset] = useState(0);
  const [deliveryDayOffset, setDeliveryDayOffset] = useState(0);
  const [pickupRange, setPickupRange] = useState<[number, number]>([8, 11]);
  const [deliveryRange, setDeliveryRange] = useState<[number, number]>([8, 11]);
  const [pickupContactName, setPickupContactName] = useState(user?.fullName ?? '');
  const [pickupContactPhone, setPickupContactPhone] = useState(user?.phone ?? '');
  const [deliveryContactName, setDeliveryContactName] = useState(user?.fullName ?? '');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState(user?.phone ?? '');
  const [notes, setNotes] = useState('');

  const toggleService = (id: string) => {
    setSelectedServices((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  };

  const validate = (): string | null => {
    if (step === 0) return null;
    if (step === 1 && Object.keys(selectedServices).length === 0) {
      return 'Vui lòng chọn ít nhất một dịch vụ';
    }
    if (step === 2) {
      if ((orderType === 'ONLINE') && !pickupAddressId) return 'Vui lòng chọn địa chỉ nhận đồ';
      if ((orderType === 'ONLINE' || orderType === 'DROP_OFF') && !deliveryAddressId) {
        return 'Vui lòng chọn địa chỉ giao đồ';
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const now = new Date();
    const pickupDate = new Date(now);
    pickupDate.setDate(now.getDate() + pickupDayOffset);
    const deliveryDate = new Date(now);
    deliveryDate.setDate(now.getDate() + deliveryDayOffset);

    const pickupRangeDef = { start: [pickupRange[0], 0] as [number, number], end: [pickupRange[1], 0] as [number, number] };
    const deliveryRangeDef = { start: [deliveryRange[0], 0] as [number, number], end: [deliveryRange[1], 0] as [number, number] };

    const payload = {
      orderType,
      pickupAddressId: orderType === 'WALKIN' ? undefined : pickupAddressId,
      deliveryAddressId: orderType === 'WALKIN' ? undefined : deliveryAddressId,
      pickupWindowStart:
        orderType === 'WALKIN'
          ? undefined
          : toDate(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate(), pickupRangeDef.start[0], pickupRangeDef.start[1]),
      pickupWindowEnd:
        orderType === 'WALKIN'
          ? undefined
          : toDate(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate(), pickupRangeDef.end[0], pickupRangeDef.end[1]),
      deliveryWindowStart:
        orderType === 'WALKIN'
          ? undefined
          : toDate(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate(), deliveryRangeDef.start[0], deliveryRangeDef.start[1]),
      deliveryWindowEnd:
        orderType === 'WALKIN'
          ? undefined
          : toDate(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate(), deliveryRangeDef.end[0], deliveryRangeDef.end[1]),
      pickupContactName: orderType === 'WALKIN' ? undefined : pickupContactName || undefined,
      pickupContactPhone: orderType === 'WALKIN' ? undefined : pickupContactPhone || undefined,
      deliveryContactName: orderType === 'WALKIN' ? undefined : deliveryContactName || undefined,
      deliveryContactPhone: orderType === 'WALKIN' ? undefined : deliveryContactPhone || undefined,
      notes: notes || undefined,
      items: Object.entries(selectedServices).map(([serviceId]) => ({ serviceId })),
    };

    try {
      const order = await createOrder.mutateAsync(payload);
      Alert.alert('Thành công', 'Đã tạo đơn hàng!', [
        { text: 'OK', onPress: () => router.replace(`/orders/${order.id}`) },
      ]);
    } catch (err) {
      Alert.alert('Tạo đơn thất bại', getApiErrorMessage(err));
    }
  };

  const error = validate();

  return (
    <Screen scroll={false}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Tạo đơn mới',
          headerTitleAlign: 'center',
        }}
      />
      <StepIndicator current={step} />
      <ScrollView contentContainerClassName="p-4 pb-10" keyboardShouldPersistTaps="handled">
        {step === 0 && <OrderTypeStep value={orderType} onChange={setOrderType} />}
        {step === 1 && <ServicesStep services={services} selected={selectedServices} onToggle={toggleService} />}
        {step === 2 && (
          <AddressStep
            orderType={orderType}
            addresses={addresses || []}
            pickupAddressId={pickupAddressId}
            deliveryAddressId={deliveryAddressId}
            onPickup={setPickupAddressId}
            onDelivery={setDeliveryAddressId}
            onAddNew={() => router.push('/addresses/new')}
          />
        )}
        {step === 3 && (
          <TimeStep
            orderType={orderType}
            pickupDayOffset={pickupDayOffset}
            deliveryDayOffset={deliveryDayOffset}
            pickupRange={pickupRange}
            deliveryRange={deliveryRange}
            onPickupDay={setPickupDayOffset}
            onDeliveryDay={setDeliveryDayOffset}
            onPickupRange={setPickupRange}
            onDeliveryRange={setDeliveryRange}
            pickupContactName={pickupContactName}
            pickupContactPhone={pickupContactPhone}
            deliveryContactName={deliveryContactName}
            deliveryContactPhone={deliveryContactPhone}
            onPickupName={setPickupContactName}
            onPickupPhone={setPickupContactPhone}
            onDeliveryName={setDeliveryContactName}
            onDeliveryPhone={setDeliveryContactPhone}
            notes={notes}
            onNotes={setNotes}
          />
        )}

        {error && step !== 3 ? (
          <Text variant="small" className="mb-2 text-accent-danger">
            {error}
          </Text>
        ) : null}

        <View className="mt-4 flex-row gap-3">
          {step > 0 && (
            <Button title="Quay lại" variant="secondary" className="flex-1" onPress={() => setStep((s) => s - 1)} />
          )}
          {step < STEPS.length - 1 ? (
            <Button
              title="Tiếp theo"
              className="flex-1"
              disabled={!!error}
              onPress={() => setStep((s) => s + 1)}
            />
          ) : (
            <Button
              title="Tạo đơn"
              className="flex-1"
              loading={createOrder.isPending}
              onPress={handleSubmit}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <View className="px-4 pb-1 pt-3">
      <View className="relative flex-row">
        <View className="absolute left-[12.5%] right-[12.5%] top-[14px] h-0.5 bg-surface-subtle" />
        {STEPS.map((label, i) => (
          <View key={label} className="flex-1 items-center">
            <View
              className={cn(
                'h-7 w-7 items-center justify-center rounded-full',
                i <= current ? 'bg-brand-600' : 'bg-surface-muted',
              )}>
              <Text variant="caption" className={cn(i <= current ? 'text-white font-bold' : 'text-ink-muted')}>
                {i + 1}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <View className="mt-1 flex-row">
        {STEPS.map((label, i) => (
          <View key={label} className="flex-1 items-center px-0.5">
            <Text
              numberOfLines={2}
              className={cn('min-h-[28px] text-center text-[11px] leading-[14px]', i <= current ? 'font-semibold text-brand-700' : 'text-ink-muted')}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function OrderTypeStep({ value, onChange }: { value: OrderType; onChange: (t: OrderType) => void }) {
  return (
    <View className="gap-3">
      {ORDER_TYPES.map((type) => {
        const active = type === value;
        return (
          <Pressable key={type} onPress={() => onChange(type)}>
            <Card className={cn('border-2', active ? 'border-brand-600 bg-brand-50' : 'border-surface-subtle')}>
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={active ? '#0a7b7b' : '#c3c8d0'}
                />
                <View className="flex-1">
                  <Text variant="body" bold numberOfLines={2}>
                    {orderTypeLabels[type].replace(' - ', ' · ')}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

function ServicesStep({
  services,
  selected,
  onToggle,
}: {
  services: { id: string; name: string; description?: string | null; pricePerUnit: number; unit: string }[];
  selected: Record<string, number>;
  onToggle: (id: string) => void;
}) {
  if (!services.length) return <Text variant="small">Không có dịch vụ nào đang hoạt động</Text>;
  return (
    <View className="gap-3">
      {services.map((service) => {
        const active = !!selected[service.id];
        return (
          <Pressable key={service.id} onPress={() => onToggle(service.id)}>
            <Card className={cn('border-2', active ? 'border-brand-600 bg-brand-50' : 'border-surface-subtle')}>
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={active ? '#16a34a' : '#c3c8d0'}
                />
                <View className="flex-1">
                  <Text variant="body" bold>
                    {service.name}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {service.description}
                  </Text>
                </View>
                <Text variant="small" bold className="text-brand-700">
                  {formatCurrency(service.pricePerUnit)}/{service.unit}
                </Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

function AddressStep({
  orderType,
  addresses,
  pickupAddressId,
  deliveryAddressId,
  onPickup,
  onDelivery,
  onAddNew,
}: {
  orderType: OrderType;
  addresses: { id: string; label: string; addressLine: string }[];
  pickupAddressId?: string;
  deliveryAddressId?: string;
  onPickup: (id: string) => void;
  onDelivery: (id: string) => void;
  onAddNew: () => void;
}) {
  if (!addresses.length) {
    return (
      <View className="gap-3">
        <Text variant="small" className="text-ink-secondary">
          Bạn chưa có địa chỉ nào. Vui lòng thêm địa chỉ trước khi tạo đơn.
        </Text>
        <Button title="Thêm địa chỉ" onPress={onAddNew} />
      </View>
    );
  }

  return (
    <View className="gap-5">
      {orderType !== 'WALKIN' ? (
        <AddressGroup title="Địa chỉ nhận đồ" addresses={addresses} value={pickupAddressId} onChange={onPickup} />
      ) : null}
      {orderType !== 'WALKIN' ? (
        <AddressGroup title="Địa chỉ giao đồ" addresses={addresses} value={deliveryAddressId} onChange={onDelivery} />
      ) : null}
      <Button title="+ Thêm địa chỉ mới" variant="outline" onPress={onAddNew} />
    </View>
  );
}

function AddressGroup({
  title,
  addresses,
  value,
  onChange,
}: {
  title: string;
  addresses: { id: string; label: string; addressLine: string }[];
  value?: string;
  onChange: (id: string) => void;
}) {
  return (
    <View className="gap-2">
      <Text variant="subtitle">{title}</Text>
      {addresses.map((addr) => {
        const active = addr.id === value;
        return (
          <Pressable key={addr.id} onPress={() => onChange(addr.id)}>
            <View className={cn('rounded-xl border-2 p-3', active ? 'border-brand-600 bg-brand-50' : 'border-surface-subtle')}>
              <Text variant="small" bold>
                {addr.label}
              </Text>
              <Text variant="caption">{addr.addressLine}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function dayOptionLabel(offset: number) {
  if (offset === 0) return 'Hôm nay';
  if (offset === 1) return 'Ngày mai';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${WEEKDAYS[d.getDay()]} ${date}`;
}

function dayDate(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function slotStartMs(offset: number, hour: number): number {
  const d = dayDate(offset);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

function slotEndMs(offset: number, hour: number): number {
  const d = dayDate(offset);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

const LAST_DAY_SLOT_HOUR = 20;
const STORE_END_HOUR = 22;

function DaySlotPicker({
  label,
  dayOffset,
  onDay,
  range,
  onRange,
  minTs,
  nowTs,
}: {
  label: string;
  dayOffset: number;
  onDay: (d: number) => void;
  range: [number, number];
  onRange: (r: [number, number]) => void;
  minTs: number;
  nowTs: number;
}) {
  const [showDates, setShowDates] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const dayDisabled = (offset: number) => slotStartMs(offset, LAST_DAY_SLOT_HOUR) < minTs;
  const slotDisabled = (startHour: number, endHour: number) =>
    slotStartMs(dayOffset, startHour) < minTs || (dayOffset === 0 && slotEndMs(dayOffset, endHour) <= nowTs);
  const customHourDisabled = (h: number) => {
    const start = slotStartMs(dayOffset, h);
    const end = slotEndMs(dayOffset, Math.min(h + 3, STORE_END_HOUR));
    return start < minTs || (dayOffset === 0 && end <= nowTs);
  };
  return (
    <View className="gap-2">
      <Text variant="subtitle">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {[
          { key: 0, label: 'Hôm nay' },
          { key: 1, label: 'Ngày mai' },
        ].map((opt) => {
          const disabled = dayDisabled(opt.key);
          const active = dayOffset === opt.key && !showDates;
          return (
            <Pressable
              key={opt.key}
              disabled={disabled}
              onPress={() => { setShowDates(false); onDay(opt.key); }}
              className={cn('rounded-lg px-3 py-2', active ? 'bg-brand-600' : 'bg-surface-muted', disabled && 'opacity-40')}>
              <Text variant="small" className={cn(active ? 'text-white font-semibold' : 'text-ink-secondary')}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setShowDates((v) => !v)}
          className={cn('rounded-lg px-3 py-2', showDates ? 'bg-brand-600' : 'bg-surface-muted')}>
          <Text variant="small" className={cn(showDates ? 'text-white font-semibold' : 'text-ink-secondary')}>
            Chọn ngày khác
          </Text>
        </Pressable>
      </View>

      {showDates ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-1">
          {Array.from({ length: 60 }, (_, i) => i + 2).map((offset) => {
            const disabled = dayDisabled(offset);
            return (
              <Pressable key={offset} disabled={disabled} onPress={() => onDay(offset)}>
                <View className={cn('rounded-lg px-3 py-2', dayOffset === offset ? 'bg-brand-600' : 'bg-surface-muted', disabled && 'opacity-40')}>
                  <Text variant="small" className={dayOffset === offset ? 'text-white font-semibold' : 'text-ink-secondary'}>
                    {dayOptionLabel(offset)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {TIME_SLOTS.map((s, i) => {
          const active = !showCustom && range[0] === s.start[0] && range[1] === s.end[0];
          const disabled = slotDisabled(s.start[0], s.end[0]);
          return (
            <Pressable
              key={i}
              disabled={disabled}
              onPress={() => { setShowCustom(false); onRange([s.start[0], s.end[0]]); }}
              className={cn('rounded-lg px-3 py-2', active ? 'bg-brand-600' : 'bg-surface-muted', disabled && 'opacity-40')}>
              <Text variant="small" className={cn(active ? 'text-white font-semibold' : 'text-ink-secondary')}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setShowCustom((v) => !v)}
          className={cn('rounded-lg px-3 py-2', showCustom ? 'bg-brand-600' : 'bg-surface-muted')}>
          <Text variant="small" className={cn(showCustom ? 'text-white font-semibold' : 'text-ink-secondary')}>
            Giờ cụ thể
          </Text>
        </Pressable>
      </View>

      {showCustom ? (
        <View className="gap-2">
          <Text variant="label">Chọn giờ bắt đầu</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-1">
            {Array.from({ length: 14 }, (_, i) => 8 + i).map((h) => {
              const active = range[0] === h;
              const disabled = customHourDisabled(h);
              return (
                <Pressable
                  key={h}
                  disabled={disabled}
                  onPress={() => onRange([h, Math.min(h + 3, STORE_END_HOUR)])}
                  className={cn('rounded-lg px-3 py-2', active ? 'bg-brand-600' : 'bg-surface-muted', disabled && 'opacity-40')}>
                  <Text variant="small" className={cn(active ? 'text-white font-semibold' : 'text-ink-secondary')}>
                    {h}:00
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text variant="caption" className="text-ink-muted">
            Kết thúc lúc {range[1]}:00
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function TimeStep(props: {
  orderType: OrderType;
  pickupDayOffset: number;
  deliveryDayOffset: number;
  pickupRange: [number, number];
  deliveryRange: [number, number];
  onPickupDay: (d: number) => void;
  onDeliveryDay: (d: number) => void;
  onPickupRange: (r: [number, number]) => void;
  onDeliveryRange: (r: [number, number]) => void;
  pickupContactName: string;
  pickupContactPhone: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  onPickupName: (v: string) => void;
  onPickupPhone: (v: string) => void;
  onDeliveryName: (v: string) => void;
  onDeliveryPhone: (v: string) => void;
  notes: string;
  onNotes: (v: string) => void;
}) {
  const deliveryMinTs = () => {
    const pickupEndDate = dayDate(props.pickupDayOffset);
    pickupEndDate.setHours(props.pickupRange[1], 0, 0, 0);
    return pickupEndDate.getTime() + 6 * 60 * 60 * 1000;
  };

  return (
    <View className="gap-5">
      {props.orderType !== 'WALKIN' ? (
        <DaySlotPicker
          label="Khung giờ nhận đồ"
          dayOffset={props.pickupDayOffset}
          onDay={props.onPickupDay}
          range={props.pickupRange}
          onRange={props.onPickupRange}
          minTs={Date.now()}
          nowTs={Date.now()}
        />
      ) : null}
      {props.orderType !== 'WALKIN' ? (
        <DaySlotPicker
          label="Khung giờ giao đồ"
          dayOffset={props.deliveryDayOffset}
          onDay={props.onDeliveryDay}
          range={props.deliveryRange}
          onRange={props.onDeliveryRange}
          minTs={deliveryMinTs()}
          nowTs={Date.now()}
        />
      ) : null}

      {props.orderType !== 'WALKIN' ? (
        <View className="gap-3">
          <Text variant="subtitle">Người nhận đồ</Text>
          <Input placeholder="Tên người nhận" value={props.pickupContactName} onChangeText={props.onPickupName} />
          <Input placeholder="Số điện thoại" keyboardType="phone-pad" value={props.pickupContactPhone} onChangeText={props.onPickupPhone} />
        </View>
      ) : null}
      {props.orderType !== 'WALKIN' ? (
        <View className="gap-3">
          <Text variant="subtitle">Người giao nhận (giao đồ)</Text>
          <Input placeholder="Tên người nhận" value={props.deliveryContactName} onChangeText={props.onDeliveryName} />
          <Input placeholder="Số điện thoại" keyboardType="phone-pad" value={props.deliveryContactPhone} onChangeText={props.onDeliveryPhone} />
        </View>
      ) : null}

      <View className="gap-2">
        <Text variant="label">Ghi chú</Text>
        <Input placeholder="Ghi chú thêm (tùy chọn)" value={props.notes} onChangeText={props.onNotes} multiline />
      </View>
    </View>
  );
}
