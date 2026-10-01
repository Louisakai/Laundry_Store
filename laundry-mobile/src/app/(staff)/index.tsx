import { useEffect } from 'react';
import { View, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { OrderCard } from '@/components/orders/order-card';
import { useMyOrders, useMyAvailability, useSetLocationToStore } from '@/hooks/useStaff';
import { useSocket } from '@/hooks/useSocket';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/api/client';

export default function StaffHomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const user = useAuthStore((s) => s.user);
  const { data: orders, isLoading } = useMyOrders();
  const toggleAvailability = useMyAvailability();
  const setLocationToStore = useSetLocationToStore();

  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const onAssigned = () => {
      pushToast('Bạn có đơn hàng mới!');
      qc.invalidateQueries({ queryKey: ['staff-orders'] });
    };
    const onStatusChanged = () => {
      qc.invalidateQueries({ queryKey: ['staff-orders'] });
    };
    socket.on('order-assigned', onAssigned);
    socket.on('order-status-changed', onStatusChanged);
    return () => {
      socket.off('order-assigned', onAssigned);
      socket.off('order-status-changed', onStatusChanged);
    };
  }, [socket, qc, pushToast]);

  const isAvailable = user?.isAvailable ?? true;
  const isShipper = user?.staffType === 'SHIPPER';

  useLocationTracker(isAvailable && isShipper);

  const handleToggleAvailability = async () => {
    try {
      const res = await toggleAvailability.mutateAsync();
      pushToast(res.isAvailable ? 'Đã bắt đầu ca làm việc' : 'Đã tạm nghỉ', 'success');
      if (res.isAvailable && isShipper) {
        await setLocationToStore.mutateAsync();
      }
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
  };

  return (
    <Screen scroll>
      {isAvailable ? (
        <View className="mb-6 flex-row items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-lg bg-emerald-600">
              <Ionicons name="radio-button-on" size={22} color="#fff" />
            </View>
            <View>
              <Text variant="body" bold className="text-emerald-900">
                Đang trực
              </Text>
              <Text variant="caption" className="text-emerald-700">
                {isShipper ? 'Shipper' : 'Nhân viên'} · {user?.fullName}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleToggleAvailability}
            className="rounded-lg border border-emerald-200 bg-white px-3.5 py-2 active:opacity-80">
            <Text variant="small" bold className="text-emerald-700">
              Tạm nghỉ
            </Text>
          </Pressable>
        </View>
      ) : (
        <Card className="mb-6 flex-row items-center justify-between p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-lg bg-surface-muted">
              <Ionicons name="moon" size={20} color="#52525b" />
            </View>
            <View>
              <Text variant="body" bold>
                Đang tạm nghỉ
              </Text>
              <Text variant="caption">{isShipper ? 'Shipper' : 'Nhân viên'}</Text>
            </View>
          </View>
          <Pressable
            onPress={handleToggleAvailability}
            className="rounded-lg bg-brand-600 px-3.5 py-2 active:opacity-80">
            <Text variant="small" bold className="text-white">
              Bắt đầu ca
            </Text>
          </Pressable>
        </Card>
      )}

      <View className="mb-3 px-1">
        <Text variant="subtitle">Đơn hàng của tôi</Text>
        <Text variant="caption" className="mt-0.5">
          {isLoading
            ? 'Đang tải…'
            : orders?.length
              ? `${orders.length} đơn đang xử lý`
              : 'Chưa có đơn nào được giao'}
        </Text>
      </View>

      {isLoading ? (
        <Loading />
      ) : !orders?.length ? (
        <EmptyState
          icon="receipt-outline"
          title="Chưa có đơn hàng"
          description="Đơn được giao cho bạn sẽ hiển thị tại đây"
        />
      ) : (
        <View className="gap-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => router.push(`/orders/${order.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
