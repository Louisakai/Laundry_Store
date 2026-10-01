import { useState } from 'react';
import { View, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRegister } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/api/client';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useRegister();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!fullName || !phone || !email || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường');
      return;
    }
    if (!/^0\d{9,10}$/.test(phone)) {
      Alert.alert('Sai số điện thoại', 'Số điện thoại phải bắt đầu bằng 0 và gồm 10-11 chữ số');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Mật khẩu yếu', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    try {
      await register.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      });
      router.replace('/');
    } catch (err) {
      Alert.alert('Đăng ký thất bại', getApiErrorMessage(err));
    }
  };

  return (
    <Screen scroll safeTop contentContainerClassName="flex-grow justify-center">
      <View className="mb-7 items-center">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-sm shadow-brand-600/30">
          <Ionicons name="water" size={28} color="#fff" />
        </View>
        <Text variant="title" className="text-center text-[26px]">
          Tạo tài khoản
        </Text>
        <Text variant="body" className="mt-1 text-center text-ink-muted">
          Đăng ký để sử dụng dịch vụ giặt ủi
        </Text>
      </View>

      <Card className="gap-4">
        <View className="gap-1.5">
          <Text variant="label">Họ và tên</Text>
          <Input placeholder="Nguyễn Văn A" value={fullName} onChangeText={setFullName} />
        </View>
        <View className="gap-1.5">
          <Text variant="label">Số điện thoại</Text>
          <Input
            placeholder="0912345678"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>
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
            placeholder="Ít nhất 6 ký tự"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Button
          title="Đăng ký"
          loading={register.isPending}
          onPress={handleRegister}
          className="mt-1"
        />
      </Card>

      <Pressable onPress={() => router.back()} className="mt-6 items-center">
        <Text variant="small" className="text-ink-secondary">
          Đã có tài khoản? <Text bold className="text-brand-700">Đăng nhập</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}
