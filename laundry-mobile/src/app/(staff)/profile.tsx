import { View, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { useLogout } from '@/hooks/useAuth';

export default function StaffProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout.mutateAsync();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Card className="mb-4 flex-row items-center gap-4">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <Text variant="title" className="text-brand-700">
            {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="subtitle">{user?.fullName}</Text>
          <Text variant="small" className="text-ink-secondary">
            {user?.email}
          </Text>
          <Text variant="caption" className="text-ink-muted">
            {user?.phone}
          </Text>
        </View>
      </Card>

      <Card className="mb-4 gap-2">
        <InfoRow label="Vai trò" value={user?.staffType === 'SHIPPER' ? 'Shipper' : 'Nhân viên giặt'} />
        {user?.workZone ? <InfoRow label="Khu vực" value={user.workZone} /> : null}
        <InfoRow
          label="Trạng thái"
          value={user?.isAvailable ? 'Đang trực' : 'Đang tạm nghỉ'}
        />
      </Card>

      <Pressable
        onPress={handleLogout}
        className="flex-row items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 py-3">
        <Ionicons name="log-out-outline" size={18} color="#dc2626" />
        <Text variant="body" bold className="text-accent-danger">
          Đăng xuất
        </Text>
      </Pressable>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text variant="small" className="text-ink-secondary">
        {label}
      </Text>
      <Text variant="small" bold>
        {value}
      </Text>
    </View>
  );
}
