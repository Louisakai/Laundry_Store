import { Stack } from 'expo-router';

export default function AddressesLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerTitleStyle: { fontSize: 17, fontWeight: '700', color: '#18181b' },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fafafa' },
        headerTintColor: '#0a7b7b',
        contentStyle: { backgroundColor: '#fafafa' },
      }}>
      <Stack.Screen name="index" options={{ title: 'Địa chỉ' }} />
      <Stack.Screen name="new" options={{ title: 'Thêm địa chỉ' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Sửa địa chỉ' }} />
    </Stack>
  );
}