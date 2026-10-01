import { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { OrderCard } from '@/components/orders/order-card';
import { useOrders } from '@/hooks/useOrders';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import type { Order, OrderStatus } from '@/types';

const statDefinitions = [
  {
    key: ['PENDING', 'CONFIRMED'],
    label: 'Chờ xử lý',
    icon: 'time-outline' as const,
    color: '#d97706',
    bg: 'bg-amber-50',
  },
  {
    key: ['PICKING_UP', 'RECEIVED', 'PROCESSING'],
    label: 'Đang xử lý',
    icon: 'sync-outline' as const,
    color: '#2563eb',
    bg: 'bg-blue-50',
  },
  {
    key: ['COMPLETED', 'DELIVERING', 'DELIVERED'],
    label: 'Hoàn thành',
    icon: 'checkmark-circle-outline' as const,
    color: '#059669',
    bg: 'bg-emerald-50',
  },
  {
    key: ['CANCELLED'],
    label: 'Đã hủy',
    icon: 'close-circle-outline' as const,
    color: '#dc2626',
    bg: 'bg-red-50',
  },
];

function countByStatuses(orders: Order[], keys: string[]) {
  return orders.filter((o) => keys.includes(o.status as OrderStatus)).length;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: orders, isLoading } = useOrders();

  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const onStatusChanged = () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    };
    socket.on('order-status-changed', onStatusChanged);
    return () => {
      socket.off('order-status-changed', onStatusChanged);
    };
  }, [socket, qc]);

  const recent = (orders || []).slice(0, 5);
  const firstName = (user?.fullName ?? 'Khách hàng').split(' ').slice(-1)[0];

  return (
    <Screen scroll>
      <View className="mb-6 flex-row items-center gap-4 rounded-xl border border-brand-100 bg-brand-50 p-4">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-600">
          <Text className="text-lg font-bold text-white">
            {firstName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="body" bold>
            Xin chào, {firstName}
          </Text>
          <Text variant="caption">Hôm nay bạn muốn giặt đồ gì?</Text>
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-white">
          <Ionicons name="water" size={18} color="#0a7b7b" />
        </View>
      </View>

      <Button
        title="Tạo đơn mới"
        className="mb-6"
        onPress={() => router.push('/orders/new')}
      />

      <View className="mb-3 px-1">
        <Text variant="subtitle">Tổng quan đơn hàng</Text>
      </View>

      <View className="mb-6 flex-row flex-wrap gap-3">
        {statDefinitions.map((stat) => (
          <View key={stat.label} style={{ flexGrow: 1, flexBasis: '45%' }}>
            <Card className="h-[136px] items-center justify-center gap-2 py-4">
              <View className={`h-10 w-10 items-center justify-center rounded-full ${stat.bg}`}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text className="text-2xl font-bold leading-7 text-ink">
                {isLoading ? '…' : countByStatuses(orders || [], stat.key)}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {stat.label}
              </Text>
            </Card>
          </View>
        ))}
      </View>

      <View className="mb-3 flex-row items-center justify-between px-1">
        <Text variant="subtitle">Đơn hàng gần đây</Text>
        <Pressable onPress={() => router.push('/orders')} hitSlop={8}>
          <Text variant="small" className="font-semibold text-brand-700">
            Xem tất cả
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <Loading />
      ) : (orders || []).length === 0 ? (
        <Card className="items-center py-8">
          <EmptyState
            icon="file-tray-outline"
            title="Chưa có đơn hàng"
            description="Hãy tạo đơn giặt ủi đầu tiên của bạn ngay bây giờ!"
          />
        </Card>
      ) : (
        <View className="gap-3">
          {recent.map((order) => (
            <OrderCard key={order.id} order={order} onPress={() => router.push(`/orders/${order.id}`)} />
          ))}
        </View>
      )}
    </Screen>
  );
}
