import { useState } from 'react';
import { View, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AddressPicker } from '@/components/addresses/address-picker';
import { useCreateAddress } from '@/hooks/useAddresses';
import { getApiErrorMessage } from '@/api/client';
import type { LatLng } from '@/types';

export default function NewAddressScreen() {
  const router = useRouter();
  const createAddress = useCreateAddress();
  const [label, setLabel] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [location, setLocation] = useState<LatLng | null>(null);

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('Thiếu tên địa chỉ', 'Vui lòng đặt tên cho địa chỉ (vd: Nhà riêng, Cơ quan)');
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
      await createAddress.mutateAsync({
        label: label.trim(),
        addressLine: fullAddress,
        latitude: location.lat,
        longitude: location.lng,
      });
      router.back();
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
  };

  return (
    <Screen scroll={false}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Thêm địa chỉ',
          headerTitleAlign: 'center',
        }}
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
            addressLine={addressLine}
            onLocationChange={(loc, line) => {
              setLocation(loc);
              setAddressLine(line);
            }}
          />
        </Card>

        <Button
          title="Lưu địa chỉ"
          className="mt-3"
          loading={createAddress.isPending}
          onPress={handleSave}
        />
      </View>
    </Screen>
  );
}
