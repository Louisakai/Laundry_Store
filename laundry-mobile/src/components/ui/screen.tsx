import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';

interface ScreenProps extends ViewProps {
  className?: string;
  scroll?: boolean;
  contentContainerClassName?: string;
  /** Apply top safe-area inset. Defaults to false — screens inside a navigator already have a header handling it. */
  safeTop?: boolean;
}

export function Screen({
  className,
  scroll = true,
  contentContainerClassName,
  safeTop = false,
  children,
  ...props
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerClassName={cn('px-5 pb-12', contentContainerClassName)}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1 px-5', contentContainerClassName)}>{children}</View>
  );

  return (
    <SafeAreaView
      className={cn('flex-1 bg-canvas', className)}
      edges={safeTop ? ['top'] : []}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
