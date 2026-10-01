"use client";

import { useParams } from "next/navigation";
import { useOrder, useCancelOrder } from "@/hooks/useOrders";
import { useSocket } from "@/hooks/useSocket";
import { useOrderReview, useCreateReview } from "@/hooks/useReviews";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  cn,
  formatCurrency,
  formatDate,
  statusLabels,
  orderTypeLabels,
  statusBadgeVariant,
} from "@/lib/utils";
import { OrderStatus, Order } from "@/types";
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Phone,
  FileText,
  Star,
  Package,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const statusOrder = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PICKING_UP,
  OrderStatus.RECEIVED,
  OrderStatus.PROCESSING,
  OrderStatus.COMPLETED,
  OrderStatus.DELIVERING,
  OrderStatus.DELIVERED,
];

function StarRating({
  value,
  onChange,
  size = "sm",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "lg";
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          className={cn(
            "transition-colors",
            size === "lg" ? "text-2xl" : "text-lg",
            star <= value ? "text-amber-400" : "text-muted-foreground/20",
            onChange && "cursor-pointer hover:scale-110",
          )}
        >
          &#9733;
        </button>
      ))}
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: order, isLoading, error } = useOrder(id);
  const cancelMutation = useCancelOrder();
  const [cancelling, setCancelling] = useState(false);
  const queryClient = useQueryClient();
  const socketRef = useSocket(id);
  const { data: existingReview } = useOrderReview(
    order?.status === "DELIVERED" ? id : "",
  );
  const createReview = useCreateReview(id);
  const [serviceRating, setServiceRating] = useState(0);
  const [shipperRating, setShipperRating] = useState(0);
  const [serviceComment, setServiceComment] = useState("");
  const [shipperComment, setShipperComment] = useState("");

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handleStatusChange = (payload: {
      orderId: string;
      status: string;
      note?: string;
      timestamp: string;
    }) => {
      queryClient.setQueryData<Order>(["order", id], (old) => {
        if (!old) return old;
        return {
          ...old,
          status: payload.status as OrderStatus,
          trackingLogs: [
            {
              id: `${payload.timestamp}-${payload.status}`,
              status: payload.status as OrderStatus,
              note: payload.note ?? null,
              created_at: payload.timestamp,
              changed_by: "",
            },
            ...old.trackingLogs,
          ],
        };
      });
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      toast.success(
        `Đơn hàng cập nhật: ${statusLabels[payload.status as keyof typeof statusLabels]}`,
      );
    };
    socket.on("order-status-changed", handleStatusChange);
    return () => {
      socket.off("order-status-changed", handleStatusChange);
    };
  }, [socketRef, id, queryClient]);

  const handleCancel = async () => {
    if (!confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    setCancelling(true);
    try {
      await cancelMutation.mutateAsync({ id });
      toast.success("Đã hủy đơn hàng");
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message;
      toast.error(msg || "Hủy đơn thất bại");
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (serviceRating === 0) {
      toast.error("Vui lòng chọn số sao dịch vụ");
      return;
    }
    try {
      await createReview.mutateAsync({
        serviceRating,
        serviceComment: serviceComment || undefined,
        shipperRating:
          order?.orderType !== "WALKIN" && shipperRating > 0
            ? shipperRating
            : undefined,
        shipperComment: shipperComment || undefined,
      });
      toast.success("Đánh giá thành công");
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message;
      toast.error(msg || "Đánh giá thất bại");
    }
  };

  if (isLoading)
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package className="h-12 w-12 text-destructive/40 mb-4" />
        <p className="text-lg font-medium text-destructive">
          Không tìm thấy đơn hàng
        </p>
        <Link href="/orders">
          <Button variant="outline" className="mt-4">
            Quay lại
          </Button>
        </Link>
      </div>
    );
  if (!order) return null;

  const canCancel =
    order.status === OrderStatus.PENDING ||
    order.status === OrderStatus.CONFIRMED;
  const currentIdx = statusOrder.indexOf(order.status as OrderStatus);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/orders">
          <Button variant="ghost" size="icon" className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold truncate">
              #{order.id.slice(0, 8)}
            </h1>
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
            {orderTypeLabels[order.orderType]}
          </p>
        </div>
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? "Đang hủy..." : "Hủy đơn"}
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />
        <CardContent className="p-5 md:p-6">
          <h2 className="font-semibold mb-6 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Tiến trình
          </h2>
          <div className="grid gap-0 sm:grid-cols-2 md:grid-cols-4">
            {statusOrder.map((s, idx) => {
              const done = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              const cancelled = order.status === OrderStatus.CANCELLED;
              const log = order.trackingLogs?.find((l) => l.status === s);
              return (
                <div
                  key={s}
                  className="relative flex sm:flex-col gap-3 sm:gap-2 pb-5 sm:pb-0 sm:pt-1"
                >
                  {idx < statusOrder.length - 1 && (
                    <div
                      className={cn(
                        "sm:absolute sm:top-3 sm:left-[calc(1rem+6px)] sm:right-0 h-px sm:h-0.5 sm:w-[calc(100%-2rem)] ml-9 sm:ml-0 mt-0 sm:mt-0",
                        done && !cancelled ? "bg-primary" : "bg-border",
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2",
                      cancelled && !done && "opacity-40",
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 z-10",
                        done && !cancelled && "border-primary bg-primary",
                        isCurrent && !cancelled && "ring-4 ring-primary/20",
                        cancelled && "border-destructive bg-destructive",
                        !done &&
                          !cancelled &&
                          "border-muted-foreground/30 bg-background",
                      )}
                    >
                      {done && !cancelled && (
                        <span className="text-white text-xs font-bold">
                          &#10003;
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          done && !cancelled
                            ? "text-foreground"
                            : "text-muted-foreground",
                          isCurrent &&
                            !cancelled &&
                            "text-primary font-semibold",
                        )}
                      >
                        {statusLabels[s]}
                      </p>
                      {log && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(log.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {order.status === OrderStatus.CANCELLED && (
              <div className="relative flex sm:flex-col gap-3 sm:gap-2">
                <div className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-destructive bg-destructive flex items-center justify-center shrink-0 z-10">
                    <span className="text-white text-xs font-bold">
                      &#10005;
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-destructive">
                      Đã hủy
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(order.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5 md:p-6 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Dịch vụ
            </h2>
            <div className="divide-y">
              {order.orderItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Số lượng: {item.quantity ?? 0} {item.service.unit}
                    </p>
                  </div>
                  <p className="text-sm font-semibold ml-4">
                    {formatCurrency(item.subtotal ?? 0)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="font-semibold">Tổng cộng</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(order.totalPrice)}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 md:p-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Địa chỉ
              </h2>
              {order.pickupAddress && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    L
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">
                      Lấy đồ
                    </p>
                    <p className="text-sm font-medium">
                      {order.pickupAddress.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.pickupAddress.addressLine}
                    </p>
                  </div>
                </div>
              )}
              {order.deliveryAddress && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    G
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">
                      Giao đồ
                    </p>
                    <p className="text-sm font-medium">
                      {order.deliveryAddress.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.deliveryAddress.addressLine}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {order.customer && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Khách hàng
                  </h2>
                  <p className="text-sm font-medium">
                    {order.customer.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.customer.phone}
                  </p>
                </CardContent>
              </Card>
            )}
            {(order.pickupWindowStart || order.deliveryWindowStart) && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Thời gian
                  </h2>
                  {order.pickupWindowStart && (
                    <div>
                      <p className="text-xs text-muted-foreground">Lấy đồ</p>
                      <p className="text-sm">
                        {formatDate(order.pickupWindowStart)}
                      </p>
                    </div>
                  )}
                  {order.deliveryWindowStart && (
                    <div>
                      <p className="text-xs text-muted-foreground">Giao đồ</p>
                      <p className="text-sm">
                        {formatDate(order.deliveryWindowStart)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            {(order.pickupContactName || order.deliveryContactName) && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Liên hệ
                  </h2>
                  {order.pickupContactName && (
                    <div>
                      <p className="text-xs text-muted-foreground">Người lấy</p>
                      <p className="text-sm">{order.pickupContactName}</p>
                      {order.pickupContactPhone && (
                        <p className="text-xs text-muted-foreground">
                          {order.pickupContactPhone}
                        </p>
                      )}
                    </div>
                  )}
                  {order.deliveryContactName && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Người nhận
                      </p>
                      <p className="text-sm">{order.deliveryContactName}</p>
                      {order.deliveryContactPhone && (
                        <p className="text-xs text-muted-foreground">
                          {order.deliveryContactPhone}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {order.notes && (
        <Card>
          <CardContent className="p-5 md:p-6 space-y-2">
            <h2 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Ghi chú
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {order.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {order.status === OrderStatus.DELIVERED &&
        !existingReview &&
        !createReview.isSuccess && (
          <Card className="overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-amber-400 to-amber-300" />
            <CardContent className="p-5 md:p-6 space-y-5">
              <h2 className="font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Đánh giá dịch vụ
              </h2>
              <div>
                <p className="text-sm font-medium mb-2">Chất lượng dịch vụ</p>
                <StarRating
                  value={serviceRating}
                  onChange={setServiceRating}
                  size="lg"
                />
              </div>
              <Textarea
                rows={2}
                placeholder="Nhận xét về dịch vụ (không bắt buộc)"
                value={serviceComment}
                onChange={(e) => setServiceComment(e.target.value)}
              />
              {order.orderType !== "WALKIN" && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Shipper giao hàng
                    </p>
                    <StarRating
                      value={shipperRating}
                      onChange={setShipperRating}
                      size="lg"
                    />
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Nhận xét về shipper (không bắt buộc)"
                    value={shipperComment}
                    onChange={(e) => setShipperComment(e.target.value)}
                  />
                </>
              )}
              <Button
                onClick={handleSubmitReview}
                disabled={createReview.isPending}
              >
                {createReview.isPending ? "Đang gửi..." : "Gửi đánh giá"}
              </Button>
            </CardContent>
          </Card>
        )}

      {existingReview && (
        <Card>
          <CardContent className="p-5 md:p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Đánh giá của bạn
            </h2>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">
                Dịch vụ
              </p>
              <StarRating value={existingReview.serviceRating} />
              {existingReview.serviceComment && (
                <p className="text-sm text-muted-foreground mt-1">
                  &ldquo;{existingReview.serviceComment}&rdquo;
                </p>
              )}
            </div>
            {existingReview.shipperRating && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  Shipper
                </p>
                <StarRating value={existingReview.shipperRating} />
                {existingReview.shipperComment && (
                  <p className="text-sm text-muted-foreground mt-1">
                    &ldquo;{existingReview.shipperComment}&rdquo;
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {order.trackingLogs && order.trackingLogs.length > 0 && (
        <Card>
          <CardContent className="p-5 md:p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-primary" />
              Lịch sử thay đổi
            </h2>
            <div className="space-y-0">
              {order.trackingLogs.toReversed().map((log, i) => (
                <div key={log.id} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    {i < order.trackingLogs.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="min-w-0 pb-2">
                    <p className="text-sm font-medium">
                      {statusLabels[log.status]}
                    </p>
                    {log.note && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.note}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
