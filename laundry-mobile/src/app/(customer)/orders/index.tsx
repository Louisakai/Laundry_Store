import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { SegmentTabs } from '@/components/ui/segment-tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { OrderCard } from '@/components/orders/order-card';
import { useOrders } from '@/hooks/useOrders';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'PROCESSING', label: 'Đang xử lý' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'DELIVERED', label: 'Đã giao' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

const PROCESSING_STATUSES = ['PICKING_UP', 'RECEIVED', 'PROCESSING', 'DELIVERING'];
const COMPLETED_STATUSES = ['COMPLETED', 'DELIVERED'];

function matches(filter: string, status: string): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'PROCESSING') return PROCESSING_STATUSES.includes(status);
  if (filter === 'COMPLETED') return COMPLETED_STATUSES.includes(status);
  return filter === status;
}

export default function OrdersListScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const { data: orders, isLoading, isError } = useOrders();

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

  const filtered = (orders || []).filter((o) => matches(filter, o.status));

  return (
    <Screen scroll contentContainerClassName="px-0 pt-0">
      <SegmentTabs tabs={FILTERS} value={filter} onChange={setFilter} />
      <View className="gap-3 px-5 pb-12 pt-1">
        {isLoading ? (
          <Loading />
        ) : isError ? (
          <EmptyState icon="cloud-offline-outline" title="Không thể tải đơn hàng" />
        ) : filtered.length === 0 ? (
          <EmptyState icon="receipt-outline" title="Không có đơn hàng" description="Không có đơn hàng nào trong mục này" />
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => router.push(`/orders/${order.id}`)}
            />
          ))
        )}
      </View>
    </Screen>
  );
}
