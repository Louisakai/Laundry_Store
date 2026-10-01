'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAdminStats, useAdminOrders, useAssignStaff } from '@/hooks/useAdmin';
import { useStaffList } from '@/hooks/useStaff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  formatCurrency,
  formatDate,
  statusLabels,
  orderTypeLabels,
  statusBadgeVariant,
} from '@/lib/utils';
import type { StaffInfo, Order } from '@/types';
import {
  Package,
  Users,
  Clock,
  AlertCircle,
  Inbox,
  Truck,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

function ActionableOrderRow({ order, shippers }: { order: Order; shippers?: StaffInfo[] }) {
  const assignStaff = useAssignStaff();
  const [staffId, setStaffId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    if (!staffId) return;
    setAssigning(true);
    try {
      await assignStaff.mutateAsync({ orderId: order.id, staffId });
      toast.success('Đã gán shipper');
    } catch {
      toast.error('Gán shipper thất bại');
    } finally {
      setAssigning(false);
      setStaffId('');
    }
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/orders/${order.id}`}
            className="font-medium hover:underline truncate"
          >
            Đơn #{order.id.slice(0, 8)}
          </Link>
          <Badge variant={statusBadgeVariant[order.status] as 'pending' | 'delivered' | 'cancelled' | 'processing'}>
            {statusLabels[order.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {order.customer?.fullName || 'N/A'} · {orderTypeLabels[order.orderType]} ·{' '}
          {formatDate(order.created_at)}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <span className="text-sm font-semibold">{formatCurrency(order.totalPrice)}</span>
        {order.staff ? (
          <span className="text-xs text-muted-foreground">NV: {order.staff.fullName}</span>
        ) : (
          <>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Gán shipper" />
              </SelectTrigger>
              <SelectContent>
                {shippers && shippers.length > 0 ? (
                  shippers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
                  ))
                ) : (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">Không có shipper online</p>
                )}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAssign} disabled={!staffId || assigning}>
              {assigning ? 'Đang gán' : 'Gán'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useAdminStats();
  const { data: pendingOrders } = useAdminOrders({
    status: 'PENDING',
    limit: 5,
    refetchInterval: 30000,
  });
  const { data: confirmedOrders } = useAdminOrders({
    status: 'CONFIRMED',
    limit: 5,
    refetchInterval: 30000,
  });
  const { data: availableStaff, isLoading: loadingStaff } = useStaffList({
    staffType: 'SHIPPER',
    isAvailable: true,
    refetchInterval: 30000,
  });
  const { data: shippers } = useStaffList({
    staffType: 'SHIPPER',
    isAvailable: true,
    refetchInterval: 30000,
  });

  const actionableOrders = useMemo(() => {
    const list = [
      ...(pendingOrders?.data ?? []),
      ...(confirmedOrders?.data ?? []).filter((o) => !o.staff),
    ];
    return list
      .filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [pendingOrders, confirmedOrders]);

  const staffByZone = useMemo(() => {
    if (!availableStaff) return {};
    return availableStaff.reduce<Record<string, StaffInfo[]>>((acc, s) => {
      const zone = s.workZone || 'Chưa phân khu';
      (acc[zone] = acc[zone] || []).push(s);
      return acc;
    }, {});
  }, [availableStaff]);

  const statCards = [
    {
      title: 'Đơn hôm nay',
      value: stats?.totalOrdersToday ?? 0,
      icon: Package,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Nhân viên online',
      value: stats?.onlineStaff ?? 0,
      icon: Users,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Đơn chưa gán',
      value: stats?.unassignedOrders ?? 0,
      icon: Clock,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      title: 'Tổng đơn',
      value: stats ? Object.values(stats.ordersByStatus).reduce((a, b) => a + b, 0) : 0,
      icon: AlertCircle,
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>
        <p className="text-muted-foreground mt-1">Bảng điều khiển quản trị hệ thống</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-destructive">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Không thể tải dữ liệu. Vui lòng thử lại.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Inbox className="h-5 w-5" /> Đơn cần xử lý
            </CardTitle>
            <Link
              href="/admin/orders"
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col h-[360px]">
            {pendingOrders && confirmedOrders && actionableOrders.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Không có đơn nào cần xử lý. Tốt lắm!
                </p>
              </div>
            ) : !pendingOrders || !confirmedOrders ? (
              <div className="flex-1 space-y-3 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto -mx-6 px-6">
                {actionableOrders.map((order) => (
                  <ActionableOrderRow key={order.id} order={order} shippers={shippers} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" /> Shipper đang hoạt động
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {availableStaff?.length ?? 0} shipper
            </span>
          </CardHeader>
          <CardContent className="flex flex-col h-[360px]">
            {loadingStaff ? (
              <div className="flex-1 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : !availableStaff || availableStaff.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Không có shipper nào đang online</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-5">
                {Object.entries(staffByZone).map(([zone, members]) => (
                  <div key={zone}>
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3" /> {zone} · {members.length} shipper
                    </p>
                    <div className="space-y-2">
                      {members.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg border"
                        >
                          <div className="p-2 rounded-full bg-primary/10 shrink-0">
                            <Truck className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{s.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Đơn hàng theo trạng thái</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats && Object.entries(stats.ordersByStatus).length > 0 ? (
              Object.entries(stats.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between gap-3">
                  <span
                    className="text-sm w-32 shrink-0 truncate"
                    title={statusLabels[status] || status}
                  >
                    {statusLabels[status] || status}
                  </span>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${(count / Math.max(...Object.values(stats.ordersByStatus))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right shrink-0">{count}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có đơn hàng nào</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}