import { useState } from 'react';
import { View, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useLogout, useChangePassword } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/api/client';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const changePassword = useChangePassword();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ mật khẩu');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Mật khẩu yếu', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Không khớp', 'Mật khẩu xác nhận không khớp');
      return;
    }
    try {
      await changePassword.mutateAsync({ oldPassword, newPassword });
      Alert.alert('Thành công', 'Đã đổi mật khẩu');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
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

      <Card className="mb-4 gap-4">
        <Text variant="subtitle">Đổi mật khẩu</Text>
        <Input placeholder="Mật khẩu cũ" secureTextEntry value={oldPassword} onChangeText={setOldPassword} />
        <Input placeholder="Mật khẩu mới" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
        <Input placeholder="Xác nhận mật khẩu mới" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        <Button
          title="Đổi mật khẩu"
          variant="outline"
          loading={changePassword.isPending}
          onPress={handleChangePassword}
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
