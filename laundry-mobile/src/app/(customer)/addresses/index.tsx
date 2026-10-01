import { View, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { useAddresses, useDeleteAddress, useSetDefaultAddress } from '@/hooks/useAddresses';
import { getApiErrorMessage } from '@/api/client';

export default function AddressesScreen() {
  const router = useRouter();
  const { data: addresses, isLoading } = useAddresses();
  const deleteAddress = useDeleteAddress();
  const setDefault = useSetDefaultAddress();

  const handleDelete = (id: string, label: string) => {
    Alert.alert('Xóa địa chỉ', `Xóa "${label}"?`, [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAddress.mutateAsync(id);
          } catch (err) {
            Alert.alert('Lỗi', getApiErrorMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <View className="mb-4">
        <Button title="+ Thêm địa chỉ" onPress={() => router.push('/addresses/new')} />
      </View>

      {isLoading ? (
        <Loading />
      ) : !addresses?.length ? (
        <EmptyState
          icon="location-outline"
          title="Chưa có địa chỉ"
          description="Thêm địa chỉ để đặt đơn giao nhận nhanh hơn"
        />
      ) : (
        <View className="gap-3">
          {addresses.map((addr) => (
            <Card key={addr.id} className="gap-2">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text variant="body" bold>
                      {addr.label}
                    </Text>
                    {addr.isDefault ? (
                      <View className="rounded-full bg-brand-50 px-2 py-0.5">
                        <Text variant="caption" className="text-brand-700">
                          Mặc định
                        </Text>
                      </View>
                    ) : null}                  </View>
                  <Text variant="small" className="mt-1 text-ink-secondary">
                    {addr.addressLine}
                  </Text>
                </View>
              </View>

              <View className="mt-1 flex-row gap-2 border-t border-surface-subtle pt-3">
                {!addr.isDefault && (
                  <Pressable
                    onPress={() => setDefault.mutate(addr.id)}
                    className="flex-row items-center gap-1 rounded-lg bg-surface-muted px-3 py-2">
                    <Ionicons name="checkmark-done-outline" size={16} color="#0a7b7b" />
                    <Text variant="small" className="text-brand-700">
                      Đặt mặc định
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => router.push(`/addresses/${addr.id}/edit`)}
                  className="flex-row items-center gap-1 rounded-lg bg-surface-muted px-3 py-2">
                  <Ionicons name="create-outline" size={16} color="#52525b" />
                  <Text variant="small">Sửa</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(addr.id, addr.label)}
                  className="flex-row items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  <Text variant="small" className="text-accent-danger">
                    Xóa
                  </Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
