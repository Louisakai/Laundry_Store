import { useCallback, useState } from 'react';
import { View, Alert, Pressable, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { StatusBadge } from '@/components/ui/badge';
import {
  OrderStatusStepper,
  TrackingTimeline,
} from '@/components/orders/order-status-stepper';
import { useOrder, useCancelOrder, useSubmitReview, useOrderReview } from '@/hooks/useOrders';
import { useOrderSocket } from '@/hooks/useSocket';
import { API_URL } from '@/constants/config';
import {
  formatCurrency,
  formatDate,
  formatTime,
  orderTypeLabels,
  paymentStatusLabels,
} from '@/lib/utils';
import { getApiErrorMessage } from '@/api/client';
import { OrderStatus, PaymentStatus } from '@/types';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showReview, setShowReview] = useState(false);

  const { data: order, isLoading, refetch } = useOrder(id);
  const cancelOrder = useCancelOrder();
  const { data: review } = useOrderReview(order?.status === 'DELIVERED' ? id : undefined);
  const submitReview = useSubmitReview();

  const refetchOrder = useCallback(() => {
    refetch();
  }, [refetch]);

  useOrderSocket(id, refetchOrder);

  const handleCancel = () => {
    Alert.alert('Hủy đơn hàng', 'Bạn có chắc muốn hủy đơn hàng này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy đơn',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelOrder.mutateAsync({ id });
            refetch();
          } catch (err) {
            Alert.alert('Hủy thất bại', getApiErrorMessage(err));
          }
        },
      },
    ]);
  };

  const handlePay = async () => {
    try {
      await WebBrowser.openBrowserAsync(`${API_URL}/pay/${id}`);
      refetch();
    } catch {
      Alert.alert('Lỗi', 'Không thể mở trang thanh toán');
    }
  };

  const canCancel = order?.status === OrderStatus.PENDING || order?.status === OrderStatus.CONFIRMED;
  const needsPayment =
    order?.paymentStatus === PaymentStatus.PENDING &&
    (order?.status === OrderStatus.COMPLETED ||
      order?.status === OrderStatus.DELIVERING ||
      order?.status === OrderStatus.DELIVERED);
  const canReview = order?.status === OrderStatus.DELIVERED && !review;

  if (isLoading || !order) {
    return (
      <Screen scroll={false}>
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Đơn #${order.id.slice(-6).toUpperCase()}`,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/orders'))}
              hitSlop={8}
              className="mr-2"
            >
              <Ionicons name="arrow-back" size={24} color="#0a7b7b" />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="p-4 pb-10" showsVerticalScrollIndicator={false}>
        <View className="mb-4 flex-row items-center justify-between">
          <StatusBadge status={order.status} />
          <Text variant="caption">{formatDate(order.created_at)}</Text>
        </View>

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
                    {item.service.unit === 'kg' && item.quantity ? ` / ${item.quantity}kg` : ''}
                  </Text>
                </View>
                <Text variant="small" bold>
                  {formatCurrency(item.subtotal ?? item.price * (item.quantity ?? 1))}
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

        <Card className="mb-4">
          <Text variant="subtitle" className="mb-3">
            Địa chỉ
          </Text>
          {order.pickupAddress ? (
            <Row icon="arrow-up-circle-outline" color="#16a34a" label="Nhận đồ" value={order.pickupAddress.addressLine} />
          ) : null}
          {order.deliveryAddress ? (
            <Row icon="arrow-down-circle-outline" color="#0a7b7b" label="Giao đồ" value={order.deliveryAddress.addressLine} />
          ) : null}
        </Card>

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
            <Text variant="small" className="text-ink-secondary">
              Thanh toán: <Text className="text-ink">{paymentStatusLabels[order.paymentStatus]}</Text>
            </Text>
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

        {canCancel && (
          <Button title="Hủy đơn hàng" variant="danger" onPress={handleCancel} loading={cancelOrder.isPending} />
        )}

        {needsPayment && (
          <Button title="Thanh toán" className="mt-3" onPress={handlePay} />
        )}

        {canReview && !showReview && (
          <Button title="Đánh giá đơn hàng" variant="outline" className="mt-3" onPress={() => setShowReview(true)} />
        )}

        {showReview && (
          <ReviewForm
            orderId={order.id}
            isWalkin={order.orderType === 'WALKIN'}
            submitting={submitReview.isPending}
            onSubmit={async (payload) => {
              try {
                await submitReview.mutateAsync({ orderId: order.id, payload });
                Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá!');
                setShowReview(false);
                refetch();
              } catch (err) {
                Alert.alert('Lỗi', getApiErrorMessage(err));
              }
            }}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  color,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row gap-2">
      <Ionicons name={icon} size={16} color={color} style={{ marginTop: 2 }} />
      <Text variant="small" className="flex-1">
        {value}
      </Text>
    </View>
  );
}

function ReviewForm({
  orderId,
  isWalkin,
  submitting,
  onSubmit,
}: {
  orderId: string;
  isWalkin: boolean;
  submitting: boolean;
  onSubmit: (payload: {
    serviceRating: number;
    serviceComment?: string;
    shipperRating?: number;
    shipperComment?: string;
  }) => void;
}) {
  const [serviceRating, setServiceRating] = useState(5);
  const [serviceComment, setServiceComment] = useState('');
  const [shipperRating, setShipperRating] = useState(5);
  const [shipperComment, setShipperComment] = useState('');

  return (
    <Card className="mt-3 gap-3">
      <Text variant="subtitle">Đánh giá dịch vụ</Text>
      <RatingPicker value={serviceRating} onChange={setServiceRating} />
      <InputArea value={serviceComment} onChangeText={setServiceComment} placeholder="Nhận xét về dịch vụ (tùy chọn)" />
      {!isWalkin ? (
        <>
          <Text variant="subtitle">Đánh giá shipper</Text>
          <RatingPicker value={shipperRating} onChange={setShipperRating} />
          <InputArea value={shipperComment} onChangeText={setShipperComment} placeholder="Nhận xét về shipper (tùy chọn)" />
        </>
      ) : null}
      <Button
        title="Gửi đánh giá"
        loading={submitting}
        onPress={() =>
          onSubmit({
            serviceRating,
            serviceComment: serviceComment || undefined,
            shipperRating: isWalkin ? undefined : shipperRating,
            shipperComment: isWalkin ? undefined : shipperComment || undefined,
          })
        }
      />
    </Card>
  );
}

function RatingPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={8}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={28} color={n <= value ? '#f59e0b' : '#d4d4d8'} />
        </Pressable>
      ))}
    </View>
  );
}

function InputArea({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#71717a"
      multiline
      className="rounded-lg border border-surface-subtle bg-white px-4 py-3 text-[15px] text-ink"
    />
  );
}
