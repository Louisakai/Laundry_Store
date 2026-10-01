'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { autocomplete, placeDetail, type MapVinaPrediction } from '@/lib/mapvina';
import { MapPin } from 'lucide-react';

interface MapVinaAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (lat: number, lng: number, address: string) => void;
  placeholder?: string;
}

export function MapVinaAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Tìm địa chỉ...',
}: MapVinaAutocompleteProps) {
  const [predictions, setPredictions] = useState<MapVinaPrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const userTypingRef = useRef(false);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const results = await autocomplete(input);
      setPredictions(results);
      setShowDropdown(results.length > 0);
      setActiveIdx(-1);
    } catch {
      setPredictions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userTypingRef.current) return;
    userTypingRef.current = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, fetchPredictions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (prediction: MapVinaPrediction) => {
    setShowDropdown(false);
    try {
      const detail = await placeDetail(prediction.place_id);
      onChange(prediction.description);
      if (detail) {
        onSelect(detail.geometry.location.lat, detail.geometry.location.lng, detail.formatted_address);
      }
    } catch {
      onChange(prediction.description);
    }
  };

  const handleSearchSubmit = async () => {
    const q = value.trim();
    if (!q) return;
    try {
      const predictions = await autocomplete(q, 1);
      if (predictions.length > 0) {
        await handleSelect(predictions[0]);
      }
    } catch { /* silent */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || !predictions.length) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearchSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIdx >= 0 && activeIdx < predictions.length) {
          handleSelect(predictions[activeIdx]);
        } else {
          handleSearchSubmit();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        type="text"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { userTypingRef.current = true; onChange(e.target.value); }}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
        autoComplete="off"
      />

      {showDropdown && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto">
          {predictions.map((p, idx) => (
            <button
              key={p.place_id}
              type="button"
              className={`w-full flex items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                idx === activeIdx ? 'bg-accent' : ''
              }`}
              onClick={() => handleSelect(p)}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {p.structured_formatting?.main_text || p.description}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.structured_formatting?.secondary_text || ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
