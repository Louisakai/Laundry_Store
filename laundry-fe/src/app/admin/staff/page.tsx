'use client';

import Link from 'next/link';
import { useStaffList, useDeleteStaff } from '@/hooks/useStaff';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { Users, UserCheck, UserX, WashingMachine, Truck, Plus, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { toast } from 'sonner';

export default function AdminStaffPage() {
  const [filterType, setFilterType] = useState('');
  const { data: staff, isLoading } = useStaffList({
    staffType: filterType || undefined,
  });
  const deleteStaff = useDeleteStaff();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const staffTypeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
    WASHER: WashingMachine,
    SHIPPER: Truck,
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Xóa ${selectedIds.size} nhân viên đã chọn?`)) return;
    const ids = Array.from(selectedIds);
    Promise.all(ids.map((id) => deleteStaff.mutateAsync(id)))
      .then(() => {
        toast.success(`Đã xóa ${ids.length} nhân viên`);
        setSelectedIds(new Set());
        setSelectMode(false);
      })
      .catch(() => toast.error('Xóa thất bại, vui lòng thử lại'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nhân viên</h1>
          <p className="text-muted-foreground mt-1">Quản lý nhân viên trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-44">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Loại NV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Tất cả</SelectItem>
                <SelectItem value="WASHER">Thợ giặt</SelectItem>
                <SelectItem value="SHIPPER">Shipper</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
          >
            {selectMode ? <X className="h-4 w-4 mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
            {selectMode ? 'Hủy' : 'Xóa nhân viên'}
          </Button>
          <Link href="/admin/staff/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" /> Thêm nhân viên
            </Button>
          </Link>
        </div>
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <span className="text-sm font-medium text-destructive">
            Đã chọn <strong>{selectedIds.size}</strong> nhân viên
          </span>
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
            <Trash2 className="h-4 w-4 mr-1" /> Xóa đã chọn
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24" /></CardContent></Card>
          ))}
        </div>
      )}

      {staff && staff.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium">Không có nhân viên nào</p>
        </Card>
      )}

      {staff && staff.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => {
            const Icon = staffTypeIcon[s.staffType] || Users;
            const isSelected = selectedIds.has(s.id);
            return (
              <div key={s.id} className="flex flex-col">
                {selectMode ? (
                  <Card
                    className={`h-full cursor-pointer transition-shadow ${isSelected ? 'ring-2 ring-destructive' : ''}`}
                    onClick={() => handleToggleSelect(s.id)}
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={isSelected} readOnly className="mt-1 h-4 w-4 accent-destructive" />
                          <div className="p-2 rounded-full bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{s.fullName}</p>
                            <p className="text-sm text-muted-foreground">{s.email}</p>
                            <p className="text-sm text-muted-foreground">{s.phone}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 ml-11">
                        <Badge variant="outline" className="text-xs">
                          {s.staffType === 'WASHER' ? 'Thợ giặt' : 'Shipper'}
                        </Badge>
                        {s.isAvailable ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                            <UserCheck className="h-3 w-3 mr-1" /> Sẵn sàng
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <UserX className="h-3 w-3 mr-1" /> Offline
                          </Badge>
                        )}
                      </div>
                      {s.workZone && (
                        <p className="text-xs text-muted-foreground mt-2 ml-11">
                          Khu vực: {s.workZone}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Link href={`/admin/staff/${s.id}`} className="flex-1">
                    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">{s.fullName}</p>
                              <p className="text-sm text-muted-foreground">{s.email}</p>
                              <p className="text-sm text-muted-foreground">{s.phone}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <Badge variant="outline" className="text-xs">
                            {s.staffType === 'WASHER' ? 'Thợ giặt' : 'Shipper'}
                          </Badge>
                          {s.isAvailable ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                              <UserCheck className="h-3 w-3 mr-1" /> Sẵn sàng
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <UserX className="h-3 w-3 mr-1" /> Offline
                            </Badge>
                          )}
                        </div>
                        {s.workZone && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Khu vực: {s.workZone}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
