import { View, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { cn } from '@/lib/cn';

interface CardProps extends ViewProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const shadowStyle: ViewStyle = {
  shadowColor: '#000000',
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export function Card({ className, style, children, ...props }: CardProps) {
  return (
    <View
      className={cn('rounded-xl border border-surface-subtle bg-white p-4', className)}
      style={[shadowStyle, style]}
      {...props}>
      {children}
    </View>
  );
}
