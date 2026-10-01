import { Pressable, ScrollView } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from './text';

interface SegmentTab {
  key: string;
  label: string;
}

interface SegmentTabsProps {
  tabs: SegmentTab[];
  value: string;
  onChange: (key: string) => void;
}

export function SegmentTabs({ tabs, value, onChange }: SegmentTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-5 py-3">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            className={cn(
              'rounded-full border px-4 py-1.5',
              active
                ? 'border-transparent bg-ink text-white'
                : 'border-surface-subtle bg-white',
            )}>
            <Text
              variant="small"
              className={cn(active ? 'font-semibold text-white' : 'text-ink-secondary')}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
