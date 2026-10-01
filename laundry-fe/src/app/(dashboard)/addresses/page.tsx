'use client';

import Link from 'next/link';
import { useAddresses, useDeleteAddress, useSetDefaultAddress } from '@/hooks/useAddresses';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Plus, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function AddressesPage() {
  const { data: addresses, isLoading, error } = useAddresses();
  const deleteMutation = useDeleteAddress();
  const defaultMutation = useSetDefaultAddress();

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa địa chỉ này?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Đã xóa địa chỉ');
    } catch {
      toast.error('Xóa thất bại');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await defaultMutation.mutateAsync(id);
      toast.success('Đã đặt làm mặc định');
    } catch {
      toast.error('Cập nhật thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Địa chỉ</h1>
          <p className="text-muted-foreground mt-1">Quản lý địa chỉ giao nhận của bạn</p>
        </div>
        <Link href="/addresses/new">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Thêm địa chỉ</Button>
        </Link>
      </div>

      {isLoading && <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>)}</div>}
      {error && (
        <Card className="p-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-destructive/40 mb-4" />
          <p className="text-lg font-medium text-destructive">Không thể tải danh sách địa chỉ</p>
          <p className="text-sm text-muted-foreground mt-1">Vui lòng thử lại sau</p>
        </Card>
      )}
      {addresses?.length === 0 && (
        <Card className="p-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium">Chưa có địa chỉ nào</p>
          <p className="text-sm text-muted-foreground mt-1">Thêm địa chỉ để đặt đơn nhanh hơn</p>
          <Link href="/addresses/new"><Button className="mt-6">Thêm địa chỉ</Button></Link>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {addresses?.map((addr) => (
          <Card key={addr.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{addr.label}</p>
                      {addr.isDefault && <Badge variant="secondary" className="text-xs">Mặc định</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{addr.addressLine}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!addr.isDefault && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSetDefault(addr.id)}>
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(addr.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
