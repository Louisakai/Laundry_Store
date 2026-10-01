import { useRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';

interface InputProps extends TextInputProps {
  className?: string;
  error?: boolean;
}

let activeInputRef: { current: TextInput | null } | null = null;

export function Input({ className, error, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<TextInput>(null);

  return (
    <TextInput
      ref={ref}
      placeholderTextColor="#71717a"
      onFocus={(e) => {
        if (activeInputRef && activeInputRef !== ref && activeInputRef.current) {
          activeInputRef.current.blur();
        }
        activeInputRef = ref;
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        if (activeInputRef === ref) activeInputRef = null;
        setFocused(false);
        onBlur?.(e);
      }}
      className={cn(
        'rounded-lg border bg-white px-4 py-3 text-[15px] text-ink',
        focused ? 'border-brand-400 ring-1 ring-brand-400/20' : 'border-surface-subtle',
        error && 'border-accent-danger bg-red-50/50',
        className,
      )}
      {...props}
    />
  );
}
