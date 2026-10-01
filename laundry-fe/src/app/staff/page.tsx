"use client";

import Link from "next/link";
import { useOrders } from "@/hooks/useOrders";
import { useToggleAvailability, useSetLocationToStore } from "@/hooks/useStaff";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatDate,
  statusLabels,
  statusBadgeVariant,
} from "@/lib/utils";
import { Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";

export default function StaffOrdersPage() {
  const { data: orders, isLoading, error, refetch } = useOrders();
  const toggleAvail = useToggleAvailability();
  const setLocationToStore = useSetLocationToStore();
  const { user } = useAuthStore();
  const socketRef = useSocket(undefined, user?.id);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleAssigned = () => {
      toast.success("Bạn có đơn hàng mới!");
      refetch();
    };

    socket.on("order-assigned", handleAssigned);
    return () => {
      socket.off("order-assigned", handleAssigned);
    };
  }, [socketRef, refetch]);

  const handleToggleAvailability = async () => {
    try {
      await toggleAvail.mutateAsync();
      if (!user?.isAvailable) {
        await setLocationToStore.mutateAsync().catch(() => {});
      }
    } catch {
      toast.error("Lỗi");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Đơn hàng của tôi
          </h1>
          <p className="text-muted-foreground mt-1">
            Danh sách đơn hàng được gán cho bạn
          </p>
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Button
            variant={user?.isAvailable ? "outline" : "default"}
            size="sm"
            onClick={handleToggleAvailability}
            disabled={toggleAvail.isPending}
          >
            {toggleAvail.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : user?.isAvailable ? (
              "Tạm nghỉ"
            ) : (
              "Bắt đầu ca"
            )}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-4">
                <Skeleton className="h-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-destructive/40 mb-4" />
          <p className="text-lg font-medium text-destructive">
            Không thể tải đơn hàng
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {(error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Vui lòng thử lại sau"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => refetch()}
          >
            Tải lại
          </Button>
        </Card>
      )}

      {!error && orders && orders.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium">Chưa có đơn hàng nào</p>
          <p className="text-sm text-muted-foreground">
            Bạn chưa được gán đơn hàng nào
          </p>
        </Card>
      )}

      {orders && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/staff/orders/${order.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          Đơn #{order.id.slice(0, 8)}
                        </p>
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
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.customer?.fullName} - {order.customer?.phone}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="flex items-end justify-between gap-3 sm:block sm:text-right sm:shrink-0">
                      <p className="text-lg font-semibold">
                        {formatCurrency(order.totalPrice)}
                      </p>
                      {order.deliveryAddress && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[14rem]">
                          {order.deliveryAddress.addressLine}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
