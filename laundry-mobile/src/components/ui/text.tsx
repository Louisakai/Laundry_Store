import { Text as RNText, type TextProps } from 'react-native';
import { cn } from '@/lib/cn';

type TextVariant = 'title' | 'subtitle' | 'body' | 'small' | 'caption' | 'label';

const variantClasses: Record<TextVariant, string> = {
  title: 'text-[24px] font-bold tracking-tight leading-8 text-ink',
  subtitle: 'text-lg font-semibold tracking-tight leading-7 text-ink',
  body: 'text-[15px] leading-6 text-ink',
  small: 'text-[13px] leading-5 text-ink',
  caption: 'text-xs leading-5 text-ink-muted',
  label: 'text-[13px] font-medium text-ink-secondary',
};

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  bold?: boolean;
  className?: string;
}

export function Text({
  variant = 'body',
  bold,
  className,
  children,
  ...props
}: AppTextProps) {
  return (
    <RNText
      className={cn(variantClasses[variant], bold && 'font-bold', className)}
      {...props}>
      {children}
    </RNText>
  );
}
