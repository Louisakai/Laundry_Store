import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
}

export function EmptyState({ icon = 'file-tray-outline', title, description }: EmptyStateProps) {
  return (
    <View className="items-center justify-center gap-2 px-8 py-12">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-50">
        <Ionicons name={icon} size={28} color="#0a7b7b" />
      </View>
      <Text variant="body" bold className="text-center">
        {title}
      </Text>
      {description ? (
        <Text variant="small" className="max-w-[260px] text-center text-ink-muted">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
