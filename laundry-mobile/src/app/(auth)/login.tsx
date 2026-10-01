import { useState } from 'react';
import { View, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLogin } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/api/client';

export default function LoginScreen() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    try {
      await login.mutateAsync({ email: email.trim(), password });
      router.replace('/');
    } catch (err) {
      Alert.alert('Đăng nhập thất bại', getApiErrorMessage(err));
    }
  };

  return (
    <Screen scroll safeTop contentContainerClassName="flex-grow justify-center">
      <View className="mb-8 items-center">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 shadow-sm shadow-brand-600/30">
          <Ionicons name="water" size={32} color="#fff" />
        </View>
        <Text variant="title" className="text-center text-[28px]">
          Nimble
        </Text>
        <Text variant="body" className="mt-1 text-center text-ink-muted">
          Đăng nhập để quản lý đơn giặt ủi của bạn
        </Text>
      </View>

      <Card className="gap-4">
        <View className="gap-1.5">
          <Text variant="label">Email</Text>
          <Input
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View className="gap-1.5">
          <Text variant="label">Mật khẩu</Text>
          <Input
            placeholder="Nhập mật khẩu"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Button
          title="Đăng nhập"
          loading={login.isPending}
          onPress={handleLogin}
          className="mt-1"
        />
      </Card>

      <Pressable onPress={() => router.push('/register')} className="mt-6 items-center">
        <Text variant="small" className="text-ink-secondary">
          Chưa có tài khoản? <Text bold className="text-brand-700">Đăng ký ngay</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}