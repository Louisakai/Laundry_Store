"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useOrders } from "@/hooks/useOrders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCurrency,
  formatDate,
  statusLabels,
  orderTypeLabels,
  statusBadgeVariant,
} from "@/lib/utils";
import { Package, Plus, ChevronLeft, ChevronRight } from "lucide-react";

const customerStatuses = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
] as const;
const PAGE_SIZE = 10;

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const { data: orders, isLoading, error } = useOrders();

  const statusParam = searchParams.get("status");
  const filter =
    statusParam && (customerStatuses as readonly string[]).includes(statusParam)
      ? statusParam
      : "ALL";

  const handleFilterChange = (v: string) => {
    setPage(1);
    router.replace(v === "ALL" ? "/orders" : `/orders?status=${v}`, {
      scroll: false,
    });
  };

  const filtered = useMemo(() => {
    const list =
      filter === "ALL" ? orders : orders?.filter((o) => o.status === filter);
    return list ?? [];
  }, [orders, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Đơn hàng</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý đơn hàng giặt ủi của bạn
          </p>
        </div>
        <Link href="/orders/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo đơn
          </Button>
        </Link>
      </div>

      <Tabs value={filter} onValueChange={handleFilterChange}>
        <TabsList className="flex-wrap h-auto">
          {customerStatuses.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs">
              {s === "ALL" ? "Tất cả" : statusLabels[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-destructive/40 mb-4" />
          <p className="text-lg font-medium text-destructive">
            Không thể tải danh sách đơn hàng
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Vui lòng thử lại sau
          </p>
        </Card>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium">Chưa có đơn hàng nào</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tạo đơn hàng đầu tiên để bắt đầu
          </p>
          <Link href="/orders/new">
            <Button className="mt-6">Tạo đơn ngay</Button>
          </Link>
        </Card>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-4">
          {paginated.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <p className="font-medium">Đơn #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {orderTypeLabels[order.orderType]}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right space-y-1.5">
                      <Badge
                        variant={
                          statusBadgeVariant[order.status] as
                            | "pending"
                            | "delivered"
                            | "cancelled"
                            | "processing"
                        }
                      >
                        {statusLabels[order.status]}
                      </Badge>
                      <p className="text-sm font-semibold">
                        {formatCurrency(order.totalPrice)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {filtered.length} đơn &middot; Trang {currentPage}/{totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-20 w-full" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
