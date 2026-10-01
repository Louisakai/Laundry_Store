import { useState } from 'react';
import { View, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { AddressPicker } from '@/components/addresses/address-picker';
import { useAddresses, useUpdateAddress } from '@/hooks/useAddresses';
import { getApiErrorMessage } from '@/api/client';
import type { LatLng } from '@/types';

export default function EditAddressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: addresses, isLoading } = useAddresses();
  const updateAddress = useUpdateAddress();

  const existing = (addresses || []).find((a) => a.id === id);

  if (isLoading || !existing) {
    return (
      <Screen scroll={false}>
        <Stack.Screen
          options={{ headerShown: true, title: 'Sửa địa chỉ', headerTitleAlign: 'center' }}
        />
        <Loading label="Đang tải địa chỉ..." />
      </Screen>
    );
  }

  return (
    <EditAddressForm key={existing.id} existing={existing} updateAddress={updateAddress} onSaved={() => router.back()} />
  );
}

function EditAddressForm({
  existing,
  updateAddress,
  onSaved,
}: {
  existing: { id: string; label: string; addressLine: string; latitude: number; longitude: number };
  updateAddress: { mutateAsync: (args: { id: string; payload: { label: string; addressLine: string; latitude: number; longitude: number } }) => Promise<unknown>; isPending: boolean };
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(existing.label);
  const [addressDetail, setAddressDetail] = useState('');
  const [addressLine, setAddressLine] = useState(existing.addressLine);
  const [location, setLocation] = useState<LatLng>({
    lat: existing.latitude,
    lng: existing.longitude,
  });

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('Thiếu tên địa chỉ', 'Vui lòng đặt tên cho địa chỉ');
      return;
    }
    if (!addressLine.trim()) {
      Alert.alert('Thiếu địa chỉ', 'Vui lòng chọn vị trí trên bản đồ hoặc nhập địa chỉ chi tiết');
      return;
    }
    if (!location) {
      Alert.alert('Chưa chọn vị trí', 'Vui lòng chọn vị trí trên bản đồ');
      return;
    }
    const fullAddress = addressDetail.trim()
      ? `${addressDetail.trim()}, ${addressLine.trim()}`
      : addressLine.trim();
    try {
      await updateAddress.mutateAsync({
        id: existing.id,
        payload: {
          label: label.trim(),
          addressLine: fullAddress,
          latitude: location.lat,
          longitude: location.lng,
        },
      });
      onSaved();
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
  };

  return (
    <Screen scroll={false}>
      <Stack.Screen
        options={{ headerShown: true, title: 'Sửa địa chỉ', headerTitleAlign: 'center' }}
      />
      <View className="flex-1 p-4">
        <Card className="gap-3">
          <Text variant="subtitle">Thông tin địa chỉ</Text>
          <View className="gap-2">
            <Text variant="label">Tên địa chỉ</Text>
            <Input
              placeholder="Nhà riêng, Văn phòng..."
              value={label}
              onChangeText={setLabel}
            />
          </View>
          <View className="gap-2">
            <Text variant="label">Số nhà / Tên quán / Cửa tiệm</Text>
            <Input
              placeholder="VD: 123 Nguyễn Huệ, quán Coffee ABC..."
              value={addressDetail}
              onChangeText={setAddressDetail}
            />
          </View>
          <View className="gap-2">
            <Text variant="label">Địa chỉ chi tiết</Text>
            <Input
              placeholder="Phường, quận, thành phố..."
              value={addressLine}
              onChangeText={setAddressLine}
            />
          </View>
        </Card>

        <Card className="mt-3 flex-1">
          <Text variant="subtitle" className="mb-3">
            Chọn vị trí trên bản đồ
          </Text>
          <AddressPicker
            initial={location}
            addressLine={addressLine}
            onLocationChange={(loc, line) => {
              setLocation(loc);
              setAddressLine(line);
            }}
          />
        </Card>

        <Button
          title="Lưu thay đổi"
          className="mt-3"
          loading={updateAddress.isPending}
          onPress={handleSave}
        />
      </View>
    </Screen>
  );
}
