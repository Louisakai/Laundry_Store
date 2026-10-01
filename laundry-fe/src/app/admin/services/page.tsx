'use client';

import { useState } from 'react';
import { useServices } from '@/hooks/useServices';
import { useCreateService, useUpdateService, useDeleteService } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { Plus, Pencil, Trash2, WashingMachine, X } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceForm {
  name: string;
  description: string;
  pricePerUnit: string;
  unit: string;
}

const emptyForm: ServiceForm = { name: '', description: '', pricePerUnit: '', unit: 'kg' };

export default function AdminServicesPage() {
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const openAdd = () => { resetForm(); setShowForm(true); };
  const openEdit = (svc: any) => {
    setEditingId(svc.id);
    setForm({ name: svc.name, description: svc.description || '', pricePerUnit: String(svc.pricePerUnit), unit: svc.unit });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); resetForm(); };

  const handleSave = async () => {
    if (!form.name || !form.pricePerUnit || !form.unit) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        pricePerUnit: parseFloat(form.pricePerUnit),
        unit: form.unit,
      };
      if (editingId) {
        await updateService.mutateAsync({ id: editingId, data: payload });
        toast.success('Đã cập nhật dịch vụ');
      } else {
        await createService.mutateAsync(payload as any);
        toast.success('Đã thêm dịch vụ');
      }
      closeForm();
    } catch {
      toast.error('Lỗi khi lưu dịch vụ');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xoá dịch vụ "${name}"?`)) return;
    try {
      await deleteService.mutateAsync(id);
      toast.success('Đã xoá dịch vụ');
    } catch {
      toast.error('Lỗi khi xoá');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dịch vụ</h1>
          <p className="text-muted-foreground mt-1">Quản lý danh sách dịch vụ giặt ủi</p>
        </div>
        {!showForm && (
          <Button className="gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Thêm dịch vụ
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{editingId ? 'Sửa dịch vụ' : 'Thêm dịch vụ mới'}</h3>
              <Button variant="ghost" size="sm" onClick={closeForm}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              <Label>Tên dịch vụ</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Giặt sấy" />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả ngắn..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Đơn giá</Label>
                <Input type="number" min={0} value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} placeholder="50000" />
              </div>
              <div className="space-y-2">
                <Label>Đơn vị</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg" />
              </div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={createService.isPending || updateService.isPending}>
              {editingId ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24" /></CardContent></Card>
          ))}
        </div>
      ) : services && services.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <Card key={svc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <WashingMachine className="h-8 w-8 text-primary mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg truncate">{svc.name}</p>
                    {svc.description && (
                      <p className="text-sm text-muted-foreground truncate">{svc.description}</p>
                    )}
                    <p className="text-2xl font-bold mt-1 text-primary">
                      {formatCurrency(svc.pricePerUnit)}
                      <span className="text-sm font-normal text-muted-foreground"> /{svc.unit}</span>
                    </p>
                  </div>
                </div>
                <Separator className="mb-3" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(svc)}>
                    <Pencil className="h-3 w-3" /> Sửa
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1 gap-1" onClick={() => handleDelete(svc.id, svc.name)}>
                    <Trash2 className="h-3 w-3" /> Xoá
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <WashingMachine className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium">Chưa có dịch vụ nào</p>
          <p className="text-sm text-muted-foreground">Thêm dịch vụ đầu tiên để bắt đầu</p>
        </Card>
      )}
    </div>
  );
}
