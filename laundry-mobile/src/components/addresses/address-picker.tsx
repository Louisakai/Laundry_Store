import { useState } from 'react';
import {
  View,
  Pressable,
  TextInput,
  FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { MapView } from '@/components/map/map-view';
import { autocomplete, placeDetail, reverseGeocode, searchAddress } from '@/lib/geocoder';
import { DEFAULT_CENTER, MAPVINA_API_KEY } from '@/constants/config';
import type { LatLng } from '@/types';

interface AddressPickerProps {
  initial?: LatLng;
  addressLine: string;
  onLocationChange: (location: LatLng, addressLine: string) => void;
  className?: string;
}

interface Suggestion {
  label: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export function AddressPicker({
  initial,
  addressLine,
  onLocationChange,
  className,
}: AddressPickerProps) {
  const [center, setCenter] = useState<LatLng>(initial ?? DEFAULT_CENTER);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [resolving, setResolving] = useState(false);

  const updateFromLocation = async (lat: number, lng: number) => {
    setCenter({ lat, lng });
    setResolving(true);
    try {
      const label = await reverseGeocode(lat, lng);
      onLocationChange({ lat, lng }, label ?? addressLine);
    } finally {
      setResolving(false);
    }
  };

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const [mapvinaRes, nominatimRes] = await Promise.allSettled([
      autocomplete(q),
      searchAddress(q),
    ]);
    const list: Suggestion[] = [];
    if (mapvinaRes.status === 'fulfilled') {
      for (const p of mapvinaRes.value) {
        list.push({ label: p.description, placeId: p.place_id });
      }
    }
    if (nominatimRes.status === 'fulfilled') {
      for (const r of nominatimRes.value) {
        list.push({ label: r.address, lat: r.lat, lng: r.lng, address: r.address });
      }
    }
    setSuggestions(list.slice(0, 6));
  };

  const selectSuggestion = async (s: Suggestion) => {
    setQuery('');
    setSuggestions([]);
    if (s.lat !== undefined && s.lng !== undefined) {
      await updateFromLocation(s.lat, s.lng);
      return;
    }
    if (s.placeId) {
      const detail = await placeDetail(s.placeId);
      if (detail) {
        await updateFromLocation(
          detail.geometry.location.lat,
          detail.geometry.location.lng,
        );
      }
    }
  };

  const locateMe = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({});
    await updateFromLocation(pos.coords.latitude, pos.coords.longitude);
  };

  return (
    <View className={cn('flex-1', className)}>
      <View className="relative">
        <View className="flex-row items-center gap-2 rounded-lg border border-surface-subtle bg-white px-3">
          <Ionicons name="search" size={18} color="#71717a" />
          <TextInput
            value={query}
            onChangeText={handleSearch}
            placeholder="Tìm kiếm địa chỉ..."
            placeholderTextColor="#71717a"
            className="flex-1 py-3 text-[15px] text-ink"
          />
          <Pressable onPress={locateMe} hitSlop={8}>
            <Ionicons name="locate-outline" size={22} color="#0a7b7b" />
          </Pressable>
        </View>

        {suggestions.length > 0 ? (
          <FlatList
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 rounded-xl border border-surface-subtle bg-white shadow-lg"
            data={suggestions}
            keyExtractor={(item, i) => `${item.label}-${i}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => selectSuggestion(item)}
                className="border-b border-surface-subtle px-3 py-3 last:border-b-0">
                <Text variant="small" numberOfLines={2}>
                  {item.label}
                </Text>
              </Pressable>
            )}
          />
        ) : null}
      </View>

      <View className="relative mt-3 flex-1 overflow-hidden rounded-2xl">
        <MapView
          center={center}
          zoom={15}
          onPress={(c) => updateFromLocation(c.lat, c.lng)}
        />
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <Ionicons name="location" size={34} color="#dc2626" />
        </View>
        {resolving ? (
          <View className="absolute bottom-2 left-2 rounded-full bg-white px-3 py-1">
            <Text variant="caption">Đang xác định địa chỉ…</Text>
          </View>
        ) : null}
      </View>

      <View className="mt-2 flex-row items-center gap-1.5">
        <Ionicons name="map-outline" size={12} color="#a1a1aa" />
        <Text variant="caption">
          {MAPVINA_API_KEY ? 'Bản đồ được cung cấp bởi MapVina' : 'Bản đồ dự phòng OpenFreeMap'}
        </Text>
      </View>
    </View>
  );
}
