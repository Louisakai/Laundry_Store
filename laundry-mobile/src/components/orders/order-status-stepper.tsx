import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { ORDER_STATUS_ORDER, statusLabels, formatDate } from '@/lib/utils';
import type { TrackingLog } from '@/types';

export function OrderStatusStepper({ status }: { status: string }) {
  const currentIndex = ORDER_STATUS_ORDER.indexOf(status);
  const isCancelled = status === 'CANCELLED';

  return (
    <View className="py-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-1">
        {ORDER_STATUS_ORDER.map((s, i) => {
          const reached = isCancelled ? i <= 1 : i <= currentIndex;
          const isCurrent = isCancelled ? false : i === currentIndex;
          return (
            <View key={s} className="flex-row items-start">
              {i > 0 && (
                <View
                  className={cn(
                    'mt-[11px] h-0.5 w-6 self-start',
                    reached && !isCancelled ? 'bg-brand-600' : 'bg-surface-subtle',
                  )}
                />
              )}
              <View className="w-[64px] items-center gap-1.5 px-0.5">
                <View
                  className={cn(
                    'h-6 w-6 items-center justify-center rounded-full border-2',
                    reached
                      ? 'border-brand-600 bg-brand-600'
                      : 'border-ink-muted/40 bg-white',
                    isCurrent && 'ring-4 ring-brand-600/15',
                  )}>
                  {isCancelled && i === 1 ? (
                    <Ionicons name="close" size={14} color="#dc2626" />
                  ) : reached ? (
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  ) : (
                    <View className="h-1.5 w-1.5 rounded-full bg-ink-muted/40" />
                  )}
                </View>
                <Text
                  variant="caption"
                  className={cn(
                    'min-h-[26px] text-center text-[11px] leading-[13px]',
                    reached ? 'font-semibold text-ink' : 'text-ink-muted',
                    isCurrent && 'font-bold text-brand-700',
                  )}>
                  {statusLabels[s]}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      {isCancelled ? (
        <Text variant="small" className="mt-2 text-center font-semibold text-accent-danger">
          Đơn hàng đã bị hủy
        </Text>
      ) : null}
    </View>
  );
}

export function TrackingTimeline({ logs }: { logs: TrackingLog[] }) {
  if (!logs.length) return null;
  return (
    <View className="gap-3">
      {logs.map((log, i) => (
        <View key={log.id} className="flex-row gap-3">
          <View className="items-center">
            <View
              className={cn(
                'mt-1 h-2.5 w-2.5 rounded-full',
                i === 0 ? 'bg-brand-600' : 'bg-surface-subtle',
              )}
            />
            {i < logs.length - 1 && <View className="w-px flex-1 bg-surface-subtle" />}
          </View>
          <View className="flex-1 pb-1">
            <Text variant="small" className="font-semibold">
              {statusLabels[log.status] ?? log.status}
            </Text>
            {log.note ? <Text variant="caption">{log.note}</Text> : null}
            <Text variant="caption" className="text-ink-muted">
              {formatDate(log.created_at)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
