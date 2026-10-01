'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PresetTimePickerProps {
  label: string;
  onSelect: (start: string | null, end: string | null) => void;
  value?: { start?: string | null; end?: string | null };
  earliestTime?: string | null;
  dynamicToday?: boolean;
}

type DayKey = 'today' | 'tomorrow' | 'other';
type SlotKey = 'morning' | 'noon' | 'afternoon' | 'evening' | 'custom';

const dayOptions: { key: DayKey; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'tomorrow', label: 'Ngày mai' },
  { key: 'other', label: 'Chọn ngày khác' },
];

const slotOptions: { key: SlotKey; label: string; range: string; start: string; end: string }[] = [
  { key: 'morning', label: 'Sáng', range: '8h-11h', start: '08:00', end: '11:00' },
  { key: 'noon', label: 'Trưa', range: '11h-14h', start: '11:00', end: '14:00' },
  { key: 'afternoon', label: 'Chiều', range: '14h-17h', start: '14:00', end: '17:00' },
  { key: 'evening', label: 'Tối', range: '17h-20h', start: '17:00', end: '20:00' },
  { key: 'custom', label: 'Giờ cụ thể', range: '', start: '', end: '' },
];

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildISO(dateStr: string, time: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const newH = Math.min(h + 1, 22);
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getDateStr(selectedDay: DayKey | null, cDate: string): string | null {
  if (selectedDay === 'today') return toDateString(new Date());
  if (selectedDay === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateString(d);
  }
  return cDate || null;
}

function isSlotBefore(dateStr: string, time: string, earliest: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime() < new Date(earliest).getTime();
}

function isSlotEndPast(time: string): boolean {
  const now = new Date();
  const [hh, mm] = time.split(':').map(Number);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
  return d.getTime() <= now.getTime();
}

function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const STORE_OPEN_HOUR = 8;

function getDynamicTodaySlots(): { key: string; label: string; range: string; start: string; end: string }[] {
  const now = new Date();
  let h = Math.max(now.getHours() + 1, STORE_OPEN_HOUR);
  if (now.getMinutes() >= 30) h += 1;

  const slots: { key: string; label: string; range: string; start: string; end: string }[] = [];
  while (h < 22) {
    const endH = Math.min(h + 3, 22);
    const key = `${String(h).padStart(2, '0')}:00`;
    slots.push({
      key,
      label: `${h}h-${endH}h`,
      range: `${h}h-${endH}h`,
      start: `${String(h).padStart(2, '0')}:00`,
      end: `${String(endH).padStart(2, '0')}:00`,
    });
    h = endH;
    if (endH >= 22) break;
  }
  return slots;
}

export function PresetTimePicker({ label, onSelect, value, earliestTime, dynamicToday }: PresetTimePickerProps) {
  const [day, setDay] = useState<DayKey | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const hasExisting = !!value?.start;

  const minSelectableDate = earliestTime
    ? toDateString(new Date(earliestTime))
    : toDateString(new Date());

  const customOption = slotOptions.find((s) => s.key === 'custom')!;
  const dynamicBlocks = getDynamicTodaySlots();
  const currentSlots = dynamicToday && day === 'today'
    ? [...dynamicBlocks, customOption]
    : [...slotOptions];

  const computeDates = useCallback(
    (selectedDay: DayKey, cDate: string, cStart: string, cEnd: string) => {
      if (!cDate || !cStart) return;
      const end = cEnd || addHour(cStart);
      onSelect(buildISO(cDate, cStart), buildISO(cDate, end));
    },
    [onSelect],
  );

  const getSlotsOnDay = (d: DayKey | null) =>
    d && dynamicToday && d === 'today' ? dynamicBlocks : slotOptions.filter((s) => s.key !== 'custom');

  const handleDayChange = (d: DayKey) => {
    if (d === 'today') {
      const allPast = getSlotsOnDay(d).every((s) => isSlotEndPast(s.end));
      if (allPast && isSlotEndPast('22:00')) return;
    }
    const dateStr = d === 'other' ? minSelectableDate : getDateStr(d, '');
    if (earliestTime && dateStr && isSlotBefore(dateStr, '20:00', earliestTime)) return;
    setDay(d);
    setSlot(null);
    setCustomDate('');
  };

  const handleSlotChange = (s: string) => {
    const slots = getSlotsOnDay(day || 'today');
    const dateStr = getDateStr(day, customDate);

    if (s !== 'custom') {
      if (earliestTime && day && dateStr) {
        const slotInfo = slots.find((o) => o.key === s);
        if (slotInfo && isSlotBefore(dateStr, slotInfo.start, earliestTime)) return;
      }
      setSlot(s);
      if (day && dateStr) {
        const slotInfo = slots.find((o) => o.key === s);
        if (slotInfo) {
          onSelect(buildISO(dateStr, slotInfo.start), buildISO(dateStr, slotInfo.end));
        }
      }
    } else {
      setSlot(s);
    }
  };

  const handleCustomDateChange = (val: string) => {
    setCustomDate(val);
    if (day && slot && slot !== 'custom') {
      const slots = getSlotsOnDay(day);
      const slotInfo = slots.find((o) => o.key === slot);
      if (slotInfo) {
        const dateStr = getDateStr(day, val);
        if (dateStr) {
          onSelect(buildISO(dateStr, slotInfo.start), buildISO(dateStr, slotInfo.end));
        }
      }
    }
  };

  const handleConfirmCustom = () => {
    if (!customStart) return;
    const dateStr = getDateStr(day, customDate);
    if (!dateStr) return;
    if (earliestTime && isSlotBefore(dateStr, customStart, earliestTime)) return;
    const [h] = customStart.split(':').map(Number);
    const endH = Math.min(h + 3, 22);
    const end = `${String(endH).padStart(2, '0')}:00`;
    setCustomEnd(end);
    onSelect(buildISO(dateStr, customStart), buildISO(dateStr, end));
  };

  const selectedSlot = currentSlots.find((s) => s.key === slot);
  const dayLabel = dayOptions.find((d) => d.key === day)?.label;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{label}</p>

      {hasExisting ? (
        <p className="text-sm text-muted-foreground">
          Đã chọn: {value.start ? new Date(value.start).toLocaleString('vi-VN') : '...'}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((opt) => {
              const dateStr = opt.key === 'other' ? customDate : getDateStr(opt.key, '');
              const todayAllPast = opt.key === 'today'
                ? getSlotsOnDay('today').every((s) => isSlotEndPast(s.end)) && isSlotEndPast('22:00')
                : false;
              const dayDisabled = !!(
                todayAllPast ||
                (earliestTime && dateStr && isSlotBefore(dateStr, '20:00', earliestTime))
              );
              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={dayDisabled}
                  onClick={() => handleDayChange(opt.key)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-all border',
                    day === opt.key
                      ? 'bg-primary/10 text-primary border-primary ring-2 ring-primary/20'
                      : dayDisabled
                        ? 'bg-muted text-muted-foreground/40 border-border cursor-not-allowed line-through'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {day === 'other' && (
            <Input
              type="date"
              value={customDate}
              min={minSelectableDate}
              onChange={(e) => handleCustomDateChange(e.target.value)}
              className="max-w-xs"
            />
          )}

          {day && (
            <>
              <div className="flex flex-wrap gap-2">
                {currentSlots.map((opt) => {
                  const dateStr = getDateStr(day, customDate) || '';
                  const slotTodayPast = day === 'today' && opt.key !== 'custom' && isSlotEndPast(opt.end);
                  const slotDisabled = !!(
                    slotTodayPast ||
                    (earliestTime && day && opt.key !== 'custom' && isSlotBefore(dateStr, opt.start, earliestTime))
                  );
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      disabled={slotDisabled}
                      onClick={() => handleSlotChange(opt.key)}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm transition-all border',
                        slot === opt.key
                          ? 'bg-primary/10 text-primary border-primary ring-2 ring-primary/20'
                          : slotDisabled
                            ? 'bg-muted text-muted-foreground/40 border-border cursor-not-allowed line-through'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground',
                      )}
                    >
                      {opt.label}
                      {opt.range && (
                        <span className="ml-1 text-xs text-muted-foreground">({opt.range})</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {slot === 'custom' && (
                <div className="flex gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Giờ bắt đầu</Label>
                    <select
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">--</option>
                      {Array.from({ length: 22 - STORE_OPEN_HOUR }, (_, i) => {
                        const h = STORE_OPEN_HOUR + i;
                        const val = `${String(h).padStart(2, '0')}:00`;
                        const dateStr = getDateStr(day, customDate);
                        const timeDisabled = !!(earliestTime && dateStr && isSlotBefore(dateStr, val, earliestTime));
                        const disabled = (day === 'today' && isSlotEndPast(val)) || timeDisabled;
                        return (
                          <option key={h} value={val} disabled={disabled}>
                            {h}:00
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!customStart}
                    onClick={handleConfirmCustom}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-medium transition-all border',
                      customStart
                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                        : 'bg-muted text-muted-foreground/40 border-border cursor-not-allowed',
                    )}
                  >
                    Xác nhận
                  </button>
                </div>
              )}

              {day && slot && slot !== 'custom' && (
                <p className="text-sm text-primary font-medium">
                  Đã chọn: {dayLabel}
                  {day === 'other' && customDate && ` (${new Date(customDate + 'T00:00:00').toLocaleDateString('vi-VN')})`}
                  , {selectedSlot?.label} ({selectedSlot?.range})
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
