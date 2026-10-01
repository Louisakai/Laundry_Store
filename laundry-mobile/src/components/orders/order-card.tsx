import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency, formatDate, orderTypeLabels } from '@/lib/utils';
import type { Order } from '@/types';

interface OrderCardProps {
  order: Order;
  onPress?: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <Card className="gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
              <Ionicons name="receipt-outline" size={18} color="#0a7b7b" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text variant="body" bold>
                  #{order.id.slice(-6).toUpperCase()}
                </Text>
                <Text variant="caption">{orderTypeLabels[order.orderType]}</Text>
              </View>
              <Text variant="caption" className="text-ink-muted">
                {formatDate(order.created_at)}
              </Text>
            </View>
          </View>
          <StatusBadge status={order.status} />
        </View>

        <View className="gap-1.5">
          {order.pickupAddress ? (
            <View className="flex-row gap-2">
              <Ionicons name="arrow-up-circle" size={15} color="#16a34a" />
              <Text variant="caption" className="flex-1" numberOfLines={1}>
                {order.pickupAddress.addressLine}
              </Text>
            </View>
          ) : null}
          {order.deliveryAddress ? (
            <View className="flex-row gap-2">
              <Ionicons name="arrow-down-circle" size={15} color="#0a7b7b" />
              <Text variant="caption" className="flex-1" numberOfLines={1}>
                {order.deliveryAddress.addressLine}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center justify-between border-t border-surface-subtle pt-2.5">
          <Text variant="caption" className="text-ink-muted">
            {order.orderItems.length} dịch vụ
          </Text>
          <View className="flex-row items-center gap-1">
            <Text variant="body" bold className="text-brand-700">
              {formatCurrency(order.totalPrice)}
            </Text>
            <Ionicons name="chevron-forward" size={15} color="#71717a" />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
