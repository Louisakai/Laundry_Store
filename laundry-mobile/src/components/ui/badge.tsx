import { View, Text as RNText } from 'react-native';
import { cn } from '@/lib/cn';
import { statusLabels } from '@/lib/utils';

const badgeVariants: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  CONFIRMED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  PICKING_UP: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  RECEIVED: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  PROCESSING: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  DELIVERING: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  DELIVERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const defaultVariant = {
  bg: 'bg-surface-muted',
  text: 'text-ink-secondary',
  border: 'border-surface-subtle',
};

export function StatusBadge({ status }: { status: string }) {
  const variant = badgeVariants[status] ?? defaultVariant;
  return (
    <View
      className={cn(
        'self-start rounded-full border px-2.5 py-0.5',
        variant.bg,
        variant.border,
      )}>
      <RNText className={cn('text-xs font-semibold', variant.text)}>
        {statusLabels[status] ?? status}
      </RNText>
    </View>
  );
}
