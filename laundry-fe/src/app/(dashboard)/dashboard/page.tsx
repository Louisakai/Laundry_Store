'use client';

import Link from 'next/link';
import { useOrders } from '@/hooks/useOrders';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, statusLabels, orderTypeLabels, statusBadgeVariant } from '@/lib/utils';
import { ShoppingCart, Clock, CheckCircle2, XCircle, ArrowRight, Package } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: orders, isLoading } = useOrders();

  const stats = [
    {
      label: 'Chờ xử lý',
      status: 'PENDING',
      value: orders?.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED').length ?? 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: 'Đang giặt',
      status: 'PROCESSING',
      value: orders?.filter((o) => ['PICKING_UP', 'RECEIVED', 'PROCESSING'].includes(o.status)).length ?? 0,
      icon: Package,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'Đã giao',
      status: 'DELIVERED',
      value: orders?.filter((o) => o.status === 'DELIVERED').length ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Đã hủy',
      status: 'CANCELLED',
      value: orders?.filter((o) => o.status === 'CANCELLED').length ?? 0,
      icon: XCircle,
      color: 'text-red-600 bg-red-50 dark:bg-red-950/30',
    },
  ];

  const recentOrders = orders?.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Xin chào, {user?.fullName?.split(' ').pop() || 'bạn'}
          </h1>
          <p className="text-muted-foreground mt-1">Tổng quan đơn hàng của bạn</p>
        </div>
        <Link href="/orders/new">
          <Button className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Tạo đơn mới
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 md:p-5">
                  <Skeleton className="h-3 w-16 mb-3" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => (
              <Link key={stat.label} href={`/orders?status=${stat.status}`}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{stat.label}</span>
                      <div className={`rounded-lg p-1.5 ${stat.color}`}>
                        <stat.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold tracking-tight">{stat.value}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      <Card>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-semibold">Đơn hàng gần đây</h2>
          <Link
            href="/orders"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <CardContent className="p-0">
          {isLoading && (
            <div className="px-5 pb-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}

          {recentOrders?.length === 0 && (
            <div className="px-5 pb-8 pt-2 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Chưa có đơn hàng nào</p>
              <p className="text-xs text-muted-foreground mt-1">Tạo đơn hàng đầu tiên để bắt đầu</p>
              <Link href="/orders/new">
                <Button size="sm" className="mt-4 gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5" /> Tạo đơn ngay
                </Button>
              </Link>
            </div>
          )}

          {recentOrders && recentOrders.length > 0 && (
            <div className="divide-y">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">#{order.id.slice(0, 8)}</span>
                      <Badge
                        variant={
                          (statusBadgeVariant[order.status] as 'pending' | 'delivered' | 'cancelled' | 'processing')
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {orderTypeLabels[order.orderType]} &middot; {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-sm font-semibold">{formatCurrency(order.totalPrice)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
