'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminOrders } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
import { Package, ChevronLeft, ChevronRight, Search, Plus } from 'lucide-react';

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('');
  const [orderType, setOrderType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useAdminOrders({
    status: status || undefined,
    orderType: orderType || undefined,
    search: search || undefined,
    page,
    limit: 5,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Đơn hàng</h1>
          <p className="text-muted-foreground mt-1">Quản lý tất cả đơn hàng trong hệ thống</p>
        </div>
        <Link href="/orders/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Tạo đơn
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, SĐT..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-44">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Tất cả</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={orderType} onValueChange={(v) => { setOrderType(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Loại đơn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Tất cả</SelectItem>
              {Object.entries(orderTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-destructive/40 mb-4" />
          <p className="text-lg font-medium text-destructive">Không thể tải danh sách</p>
        </Card>
      )}

      {data && data.data.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium">Không có đơn hàng nào</p>
        </Card>
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="space-y-4">
            {data.data.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`}>
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Đơn #{order.id.slice(0, 8)}</p>
                          <Badge variant={statusBadgeVariant[order.status] as 'pending' | 'delivered' | 'cancelled' | 'processing'}>
                            {statusLabels[order.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.customer?.fullName} - {order.customer?.phone}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {orderTypeLabels[order.orderType]} · {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{formatCurrency(order.totalPrice)}</p>
                        {order.staff && (
                          <p className="text-xs text-muted-foreground">{order.staff.fullName}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Trang {data.page}/{data.totalPages} · {data.total} đơn
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
