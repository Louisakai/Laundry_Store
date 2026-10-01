'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateStaff } from '@/hooks/useStaff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewStaffPage() {
  const router = useRouter();
  const createMutation = useCreateStaff();
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    staffType: '',
    workZone: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedCreds, setSavedCreds] = useState({ email: '', password: '' });
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim() || !form.fullName.trim() || !form.phone.trim() || !form.staffType) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    try {
      await createMutation.mutateAsync(form);
      setSavedCreds({ email: form.email, password: form.password });
      setShowSuccess(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Thêm nhân viên thất bại');
    }
  };

  const handleCopy = (text: string, field: 'email' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/staff">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Thêm nhân viên</h1>
      </div>

      {!showSuccess && (
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thông tin nhân viên</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ và tên</Label>
              <Input
                id="fullName"
                placeholder="Nguyễn Văn A"
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nhanvien@example.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                placeholder="0912345678"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffType">Loại nhân viên</Label>
              <Select
                value={form.staffType}
                onValueChange={(v) => setForm((p) => ({ ...p, staffType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WASHER">Thợ giặt</SelectItem>
                  <SelectItem value="SHIPPER">Shipper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workZone">Khu vực phụ trách</Label>
              <Input
                id="workZone"
                placeholder="VD: Quận 1, Quận 2..."
                value={form.workZone}
                onChange={(e) => setForm((p) => ({ ...p, workZone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ít nhất 6 ký tự"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Đang lưu...' : 'Lưu nhân viên'}
        </Button>
      </form>
      )}

      {showSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg text-green-800">Tạo tài khoản thành công</CardTitle>
            <p className="text-sm text-green-700">
              Chuyển thông tin đăng nhập này cho nhân viên
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Email</p>
              <div className="flex items-center gap-2 p-2 rounded-md bg-white border">
                <code className="flex-1 text-sm">{savedCreds.email}</code>
                <button
                  type="button"
                  onClick={() => handleCopy(savedCreds.email, 'email')}
                  className="p-1 hover:text-primary transition-colors"
                >
                  {copiedField === 'email' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Mật khẩu</p>
              <div className="flex items-center gap-2 p-2 rounded-md bg-white border">
                <code className="flex-1 text-sm">{savedCreds.password}</code>
                <button
                  type="button"
                  onClick={() => handleCopy(savedCreds.password, 'password')}
                  className="p-1 hover:text-primary transition-colors"
                >
                  {copiedField === 'password' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/admin/staff')}
              >
                Về danh sách
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setShowSuccess(false);
                  setForm({ email: '', password: '', fullName: '', phone: '', staffType: '', workZone: '' });
                }}
              >
                Thêm tiếp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
