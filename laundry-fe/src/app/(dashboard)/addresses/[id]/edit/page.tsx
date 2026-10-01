'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUpdateAddress } from '@/hooks/useAddresses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Address } from '@/types';
import { MapPicker } from '@/components/addresses/MapPicker';

export default function EditAddressPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const updateMutation = useUpdateAddress(id);
  const [form, setForm] = useState({
    label: '',
    addressDetail: '',
    addressLine: '',
    latitude: 0,
    longitude: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await api.get(`/addresses/${id}`);
        const addr: Address = res.data;
        setForm({
          label: addr.label,
          addressDetail: '',
          addressLine: addr.addressLine,
          latitude: addr.latitude,
          longitude: addr.longitude,
        });
      } catch {
        toast.error('Không tìm thấy địa chỉ');
        router.push('/addresses');
      } finally {
        setLoading(false);
      }
    };
    fetchAddress();
  }, [id, router]);

  const handleLocationChange = (lat: number, lng: number) => {
    setForm((p) => ({ ...p, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.addressLine.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const fullAddress = form.addressDetail
      ? form.addressDetail.trim() + ', ' + form.addressLine.trim()
      : form.addressLine.trim();
    try {
      await updateMutation.mutateAsync({
        label: form.label,
        addressLine: fullAddress,
        latitude: form.latitude,
        longitude: form.longitude,
      });
      toast.success('Cập nhật địa chỉ thành công');
      router.push('/addresses');
    } catch {
      toast.error('Cập nhật địa chỉ thất bại');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/addresses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Sửa địa chỉ</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thông tin địa chỉ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Tên địa chỉ</Label>
              <Input
                id="label"
                placeholder="Nhà riêng, Văn phòng..."
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressDetail">Số nhà / Tên quán / Cửa tiệm</Label>
              <Input
                id="addressDetail"
                placeholder="VD: 123 Nguyễn Huệ, quán Coffee ABC..."
                value={form.addressDetail}
                onChange={(e) => setForm((p) => ({ ...p, addressDetail: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine">Địa chỉ chi tiết</Label>
              <Input
                id="addressLine"
                placeholder="Phường, quận, thành phố..."
                value={form.addressLine}
                onChange={(e) => setForm((p) => ({ ...p, addressLine: e.target.value }))}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chọn vị trí trên bản đồ</CardTitle>
          </CardHeader>
          <CardContent>
            <MapPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onLocationChange={handleLocationChange}
              onAddressResolve={(addr) => setForm((p) => ({ ...p, addressLine: addr }))}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </form>
    </div>
  );
}
