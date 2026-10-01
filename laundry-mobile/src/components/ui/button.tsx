import { Pressable, type PressableProps } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from './text';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 active:bg-brand-700',
  secondary: 'bg-white border border-surface-subtle active:bg-surface-muted',
  outline: 'bg-white border border-brand-200 active:bg-brand-50',
  ghost: 'bg-transparent active:bg-surface-muted',
  danger: 'bg-red-50 border border-red-100 active:bg-red-100',
};

const textClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-ink',
  outline: 'text-brand-700',
  ghost: 'text-brand-700',
  danger: 'text-accent-danger',
};

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
}

export function Button({
  title,
  variant = 'primary',
  loading,
  onPress,
  disabled,
  className,
  textClassName,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center rounded-lg px-5 py-3',
        variantClasses[variant],
        isDisabled && 'opacity-50',
        className,
      )}
      {...rest}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#ffffff' : '#0a7b7b'}
          size="small"
        />
      ) : (
        <Text
          className={cn('text-[15px] font-semibold', textClasses[variant], textClassName)}
          numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}