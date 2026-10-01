import { Stack } from 'expo-router';

export default function StaffOrdersLayout() {
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
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết đơn' }} />
    </Stack>
  );
}