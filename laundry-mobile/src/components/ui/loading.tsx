import { ActivityIndicator, View } from 'react-native';
import { Text } from './text';

export function Loading({ label }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-canvas py-10">
      <ActivityIndicator size="large" color="#0a7b7b" />
      {label ? <Text variant="caption">{label}</Text> : null}
    </View>
  );
}
