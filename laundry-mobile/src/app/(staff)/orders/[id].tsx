import { useState } from 'react';
import { View, Alert, Pressable, ScrollView, Modal } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { StatusBadge } from '@/components/ui/badge';
import {
  OrderStatusStepper,
  TrackingTimeline,
} from '@/components/orders/order-status-stepper';
import { useAuthStore } from '@/stores/authStore';
import {
  useOrder,
  useUpdateOrderStatus,
  useWeighOrder,
  useCompleteDelivery,
  useConfirmPayment,
} from '@/hooks/useOrders';
import { useOrderSocket } from '@/hooks/useSocket';
import {
  formatCurrency,
  formatDate,
  formatTime,
  orderTypeLabels,
} from '@/lib/utils';
import { getApiErrorMessage } from '@/api/client';
import { OrderStatus, PaymentProvider, PaymentStatus, StaffType, type Order } from '@/types';

function getStaffActions(order: Order, staffType?: string | null) {
  const s = order.status;
  if (staffType === StaffType.SHIPPER) {
    if (order.orderType === 'DROP_OFF') {
      if (s === OrderStatus.COMPLETED) return { next: OrderStatus.DELIVERING, label: 'Đi giao đồ' };
      return null;
    }
    if (s === OrderStatus.CONFIRMED) return { next: OrderStatus.PICKING_UP, label: 'Đi lấy đồ' };
    if (s === OrderStatus.PICKING_UP) return { next: OrderStatus.RECEIVED, label: 'Đã nhận đồ' };
    if (s === OrderStatus.COMPLETED) return { next: OrderStatus.DELIVERING, label: 'Đi giao đồ' };
    return null;
  }
  if (order.orderType === 'DROP_OFF') {
    if (s === OrderStatus.CONFIRMED) return { next: OrderStatus.RECEIVED, label: 'Đã nhận đồ' };
    if (s === OrderStatus.RECEIVED) return { next: OrderStatus.PROCESSING, label: 'Bắt đầu giặt' };
    if (s === OrderStatus.PROCESSING) return { next: OrderStatus.COMPLETED, label: 'Hoàn thành giặt' };
    if (s === OrderStatus.COMPLETED) return { next: OrderStatus.DELIVERING, label: 'Đi giao đồ' };
    return null;
  }
  if (s === OrderStatus.RECEIVED) return { next: OrderStatus.PROCESSING, label: 'Bắt đầu giặt' };
  if (s === OrderStatus.PROCESSING) return { next: OrderStatus.COMPLETED, label: 'Hoàn thành giặt' };
  if (s === OrderStatus.COMPLETED && order.orderType === 'WALKIN') {
    return { next: OrderStatus.DELIVERED, label: 'Xác nhận đã giao' };
  }
  return null;
}

export default function StaffOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const staffType = user?.staffType;

  const { data: order, isLoading, refetch } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const weighOrder = useWeighOrder();
  const completeDelivery = useCompleteDelivery();
  const confirmPayment = useConfirmPayment();

  const [weighValues, setWeighValues] = useState<Record<string, string>>({});
  const [payModal, setPayModal] = useState(false);
  const [provider, setProvider] = useState<PaymentProvider>(PaymentProvider.PAYOS);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);

  const refetchOrder = (payload?: { status?: string }) => {
    refetch();
    if (payload?.status === OrderStatus.DELIVERED) {
      setPayModal(false);
      setCheckoutUrl(null);
      setQrImage(null);
    }
  };
  useOrderSocket(id, refetchOrder);

  if (isLoading || !order) {
    return (
      <Screen scroll={false}>
        <Loading />
      </Screen>
    );
  }

  const action = getStaffActions(order, staffType);
  const isWasher = staffType !== StaffType.SHIPPER;
  const needsWeigh =
    isWasher &&
    order.status === OrderStatus.RECEIVED &&
    order.orderItems.some((i) => !i.quantity);
  const needsPayment =
    (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERING) &&
    order.paymentStatus === PaymentStatus.PENDING;

  const handleStatus = async () => {
    if (!action) return;
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        status: action.next,
        ...(action.next === OrderStatus.DELIVERED
          ? { lat: undefined, lng: undefined }
          : {}),
      });
      refetch();
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
  };

  const handleWeigh = async () => {
    const items = order.orderItems
      .filter((i) => !i.quantity)
      .map((i) => ({ orderItemId: i.id, quantity: parseFloat(weighValues[i.id] || '0') }))
      .filter((i) => !Number.isNaN(i.quantity));
    if (!items.length || items.some((i) => i.quantity <= 0)) {
      Alert.alert('Thiếu khối lượng', 'Vui lòng nhập khối lượng (kg) cho từng dịch vụ');
      return;
    }
    try {
      await weighOrder.mutateAsync({ id: order.id, items });
      refetch();
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
  };

  const handleCompleteDelivery = async () => {
    try {
      const res = (await completeDelivery.mutateAsync({
        id: order.id,
        provider,
      })) as { checkoutUrl?: string | null; qrCode?: string | null };
      if (provider === PaymentProvider.PAYOS && res.checkoutUrl) {
        setCheckoutUrl(res.checkoutUrl);
        setQrImage(res.qrCode ?? null);
      } else {
        Alert.alert('Thành công', 'Đã thu tiền mặt (COD).');
        setPayModal(false);
        refetch();
      }
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
  };

  const handleConfirmPayment = async () => {
    try {
      await confirmPayment.mutateAsync(order.id);
      setCheckoutUrl(null);
      setQrImage(null);
      setPayModal(false);
      refetch();
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
  };

  return (
    <Screen scroll={false}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Đơn #${order.id.slice(-6).toUpperCase()}`,
          headerTitleAlign: 'center',
        }}
      />
      <ScrollView contentContainerClassName="p-4 pb-10" showsVerticalScrollIndicator={false}>
        <View className="mb-4 flex-row items-center justify-between">
          <StatusBadge status={order.status} />
          <Text variant="caption">{formatDate(order.created_at)}</Text>
        </View>

        {order.customer ? (
          <Card className="mb-4 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50">
              <Text className="font-bold text-brand-700">
                {order.customer.fullName?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text variant="body" bold>
                {order.customer.fullName}
              </Text>
              <Text variant="caption">{order.customer.phone}</Text>
            </View>
          </Card>
        ) : null}

        <Card className="mb-4">
          <OrderStatusStepper status={order.status} />
        </Card>

        <Card className="mb-4">
          <Text variant="subtitle" className="mb-3">
            Dịch vụ
          </Text>
          <View className="gap-2">
            {order.orderItems.map((item) => (
              <View key={item.id} className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text variant="small">{item.service.name}</Text>
                  <Text variant="caption">
                    {formatCurrency(item.price)}
                    {item.quantity ? ` x ${item.quantity}${item.service.unit}` : ' (chưa cân)'}
                  </Text>
                </View>
                <Text variant="small" bold>
                  {item.subtotal ? formatCurrency(item.subtotal) : '—'}
                </Text>
              </View>
            ))}
          </View>
          <View className="mt-3 flex-row items-center justify-between border-t border-surface-subtle pt-3">
            <Text variant="small" className="text-ink-secondary">
              Tổng cộng
            </Text>
            <Text variant="subtitle" className="text-brand-700">
              {formatCurrency(order.totalPrice)}
            </Text>
          </View>
        </Card>

        {needsWeigh && (
          <Card className="mb-4 gap-3">
            <Text variant="subtitle">Cân khối lượng</Text>
            {order.orderItems
              .filter((i) => !i.quantity)
              .map((item) => (
                <View key={item.id} className="gap-1">
                  <Text variant="small">
                    {item.service.name} ({item.service.unit})
                  </Text>
                  <Input
                    keyboardType="decimal-pad"
                    placeholder="Nhập khối lượng"
                    value={weighValues[item.id] ?? ''}
                    onChangeText={(v) => setWeighValues((p) => ({ ...p, [item.id]: v }))}
                  />
                </View>
              ))}
            <Button title="Xác nhận cân" onPress={handleWeigh} loading={weighOrder.isPending} />
          </Card>
        )}

        <Card className="mb-4">
          <Text variant="subtitle" className="mb-3">
            Thông tin đơn
          </Text>
          <View className="gap-2">
            <Text variant="small" className="text-ink-secondary">
              Loại đơn: <Text className="text-ink">{orderTypeLabels[order.orderType]}</Text>
            </Text>
            {order.pickupWindowStart ? (
              <Text variant="small" className="text-ink-secondary">
                Nhận đồ: <Text className="text-ink">{formatTime(order.pickupWindowStart)} - {formatTime(order.pickupWindowEnd)}</Text>
              </Text>
            ) : null}
            {order.deliveryWindowStart ? (
              <Text variant="small" className="text-ink-secondary">
                Giao đồ: <Text className="text-ink">{formatTime(order.deliveryWindowStart)} - {formatTime(order.deliveryWindowEnd)}</Text>
              </Text>
            ) : null}
            {order.notes ? (
              <Text variant="small" className="text-ink-secondary">
                Ghi chú: <Text className="text-ink">{order.notes}</Text>
              </Text>
            ) : null}
          </View>
        </Card>

        {order.trackingLogs.length > 0 ? (
          <Card className="mb-4">
            <Text variant="subtitle" className="mb-3">
              Lịch sử trạng thái
            </Text>
            <TrackingTimeline logs={order.trackingLogs} />
          </Card>
        ) : null}

        <View className="gap-3">
          {action && (
            <Button title={action.label} loading={updateStatus.isPending} onPress={handleStatus} />
          )}
          {needsPayment && (
            <Button title="Thu tiền khách" variant="outline" onPress={() => setPayModal(true)} />
          )}
        </View>
      </ScrollView>

      <Modal visible={payModal} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <Card className="w-full gap-4">
            <Text variant="subtitle">Thu tiền {formatCurrency(order.totalPrice)}</Text>
            {!checkoutUrl ? (
              <>
                {[
                  { key: PaymentProvider.CASH, label: 'Tiền mặt (COD)' },
                  { key: PaymentProvider.PAYOS, label: 'PayOS (QR chuyển khoản)' },
                ].map((p) => (
                  <Pressable
                    key={p.key}
                    onPress={() => setProvider(p.key)}
                    className="flex-row items-center gap-3 rounded-xl border border-surface-subtle p-3">
                    <Ionicons
                      name={provider === p.key ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={provider === p.key ? '#0a7b7b' : '#c3c8d0'}
                    />
                    <Text variant="body">{p.label}</Text>
                  </Pressable>
                ))}
                <Button
                  title="Xác nhận"
                  loading={completeDelivery.isPending}
                  onPress={handleCompleteDelivery}
                />
              </>
            ) : (
              <>
                <View className="items-center gap-3 py-2">
                  <View className="rounded-2xl bg-white p-4">
                    <QRCode value={qrImage ?? checkoutUrl ?? ''} size={180} />
                  </View>
                  <Text variant="caption" className="text-center">
                    Khách quét mã QR để thanh toán qua PayOS. Mã có thời hạn ~15 phút.
                  </Text>
                </View>
                <Button
                  title="Tạo lại mã QR"
                  variant="outline"
                  loading={completeDelivery.isPending}
                  onPress={handleCompleteDelivery}
                />
                <Button
                  title="Đã nhận được chuyển khoản"
                  loading={confirmPayment.isPending}
                  onPress={handleConfirmPayment}
                />
              </>
            )}
            <Button title="Đóng" variant="ghost" onPress={() => setPayModal(false)} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
