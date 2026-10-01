import { useEffect, useMemo } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useToastStore } from '@/stores/toastStore';

const typeStyles: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { icon: 'checkmark-circle', color: '#34d399' },
  error: { icon: 'alert-circle', color: '#f87171' },
  info: { icon: 'information-circle', color: '#60a5fa' },
};

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 top-14 z-50 px-5">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDone={() => remove(toast.id)} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDone }: { toast: { id: number; message: string; type: string }; onDone: () => void }) {
  const opacity = useMemo(() => new Animated.Value(0), []);
  const translateY = useMemo(() => new Animated.Value(-8), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -8, duration: 250, useNativeDriver: true }),
      ]).start(() => onDone());
    }, 3200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = typeStyles[toast.type] ?? typeStyles.info;

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className="mb-2 overflow-hidden rounded-lg"
      pointerEvents="box-none">
      <Pressable
        onPress={onDone}
        className="flex-row items-center gap-2.5 rounded-lg bg-ink px-4 py-3 shadow-lg shadow-black/20">
        <Ionicons name={style.icon} size={18} color={style.color} />
        <Text variant="small" className="flex-1 text-white">
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
