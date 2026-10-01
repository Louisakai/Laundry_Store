import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import { formatDate } from '@/lib/utils';

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  ORDER_STATUS: 'receipt-outline',
  PAYMENT: 'card-outline',
  PROMOTION: 'pricetag-outline',
  SYSTEM: 'information-circle-outline',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  const handlePress = async (id: string, relatedId?: string | null) => {
    if (!relatedId) return;
    if (!notifications?.find((n) => n.id === id)?.isRead) {
      await markRead.mutateAsync(id);
    }
    router.push(`/orders/${relatedId}`);
  };

  return (
    <Screen scroll>
      <View className="mb-3 flex-row items-center justify-between">
        <Text variant="caption">
          {unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Tất cả đã đọc'}
        </Text>
        {unreadCount > 0 ? (
          <Pressable onPress={() => markAllRead.mutate()}>
            <Text variant="small" className="text-brand-700">
              Đánh dấu tất cả
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <Loading />
      ) : !notifications?.length ? (
        <EmptyState icon="notifications-outline" title="Chưa có thông báo" />
      ) : (
        <View className="gap-3">
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => handlePress(n.id, n.relatedId)}
              className="active:opacity-80">
              <Card
                className={`flex-row gap-3 ${!n.isRead ? 'border-brand-200 bg-brand-50' : ''}`}>
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-white">
                  <Ionicons
                    name={typeIcons[n.type] ?? 'notifications-outline'}
                    size={20}
                    color="#0a7b7b"
                  />
                </View>
                <View className="flex-1">
                  <Text variant="small" bold={!n.isRead}>
                    {n.title}
                  </Text>
                  <Text variant="caption" className="mt-0.5">
                    {n.content}
                  </Text>
                  <Text variant="caption" className="mt-1 text-ink-muted">
                    {formatDate(n.created_at)}
                  </Text>
                </View>
                {!n.isRead ? <View className="mt-1 h-2 w-2 rounded-full bg-brand-600" /> : null}              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
