"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useOrder,
  useUpdateOrderStatus,
  useCompleteDelivery,
  useWeighOrder,
  useConfirmPayment,
} from "@/hooks/useOrders";
import { useSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  formatCurrency,
  formatDate,
  statusLabels,
  statusBadgeVariant,
} from "@/lib/utils";
import {
  Package,
  ArrowLeft,
  MapPin,
  CheckCircle,
  Truck,
  ShoppingBag,
  Scale,
  Banknote,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { PaymentStatus } from "@/types";

export default function StaffOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: order, isLoading, refetch } = useOrder(params.id);
  const updateStatus = useUpdateOrderStatus();
  const completeDelivery = useCompleteDelivery();
  const weighOrder = useWeighOrder();
  const socketRef = useSocket(params.id);
  const [weighValues, setWeighValues] = useState<Record<string, number>>({});
  const [weighing, setWeighing] = useState(false);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [payosUrl, setPayosUrl] = useState<string | null>(null);
  const [payosQr, setPayosQr] = useState<string | null>(null);
  const { user } = useAuthStore();

  const isShipper = user?.staffType === "SHIPPER";
  const isAdmin = user?.role === "ADMIN";
  const canAct = isAdmin || order?.staff_id === user?.id;

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleUpdate = () => refetch();
    socket.on("order-status-changed", handleUpdate);
    return () => {
      socket.off("order-status-changed", handleUpdate);
    };
  }, [socketRef, refetch]);

  useEffect(() => {
    if (
      order?.paymentStatus === PaymentStatus.SUCCESS &&
      (payosUrl || payosQr)
    ) {
      setPayosUrl(null);
      setPayosQr(null);
    }
  }, [order?.paymentStatus, payosUrl, payosQr]);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const payload: {
        id: string;
        status: string;
        lat?: number;
        lng?: number;
      } = {
        id: params.id,
        status: newStatus,
      };

      if (newStatus === "DELIVERED" && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
            });
          },
        ).catch(() => null);
        if (pos) {
          payload.lat = pos.coords.latitude;
          payload.lng = pos.coords.longitude;
        }
      }

      await updateStatus.mutateAsync(payload);
      toast.success(`Đã cập nhật: ${statusLabels[newStatus]}`);
      refetch();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể cập nhật trạng thái";
      toast.error(msg);
    }
  };

  const handleCompleteDelivery = async (provider?: string) => {
    try {
      const result = (await completeDelivery.mutateAsync({
        id: params.id,
        provider,
      })) as { checkoutUrl?: string; qrCode?: string };
      if (result.checkoutUrl) {
        setPayosUrl(result.checkoutUrl);
        setPayosQr(result.qrCode ?? null);
      } else {
        toast.success("Hoàn tất giao hàng");
      }
      setShowPaymentMethod(false);
      refetch();
    } catch {
      toast.error("Không thể hoàn tất");
    }
  };

  const confirmPayment = useConfirmPayment();
  const handleConfirmPayment = async () => {
    try {
      await confirmPayment.mutateAsync(params.id);
      toast.success("Xác nhận thanh toán thành công");
      refetch();
    } catch {
      toast.error("Không thể xác nhận thanh toán");
    }
  };

  const handleWeigh = async () => {
    setWeighing(true);
    try {
      const items = Object.entries(weighValues).map(
        ([orderItemId, quantity]) => ({
          orderItemId,
          quantity,
        }),
      );
      await weighOrder.mutateAsync({ id: params.id, items });
      toast.success("Cân đồ thành công");
      setWeighValues({});
      refetch();
    } catch {
      toast.error("Không thể cập nhật cân");
    } finally {
      setWeighing(false);
    }
  };

  const needsWeigh =
    order?.status === "RECEIVED" && order?.orderItems?.some((i) => !i.quantity);
  const weighedItems =
    order?.status === "RECEIVED" && order?.orderItems?.every((i) => i.quantity);

  const calcPreviewTotal = () => {
    if (!order) return 0;
    return order.orderItems.reduce((sum, item) => {
      const qty = weighValues[item.id] ?? item.quantity ?? 0;
      return sum + qty * item.price;
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!order) {
    return (
      <Card className="p-12 text-center">
        <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-lg font-medium">Không tìm thấy đơn hàng</p>
      </Card>
    );
  }

  const getStaffActions = (): Record<string, string[]> => {
    if (order?.orderType === "DROP_OFF") {
      if (isShipper) {
        return {
          COMPLETED: ["DELIVERING"],
        };
      }
      return {
        CONFIRMED: ["RECEIVED"],
        RECEIVED: ["PROCESSING"],
        PROCESSING: ["DELIVERING"],
      };
    }
    const shipperActions: Record<string, string[]> = {
      CONFIRMED: ["PICKING_UP"],
      PICKING_UP: ["RECEIVED"],
      COMPLETED: ["DELIVERING"],
    };
    const washerActions: Record<string, string[]> = {
      RECEIVED: ["PROCESSING"],
      PROCESSING: ["COMPLETED"],
    };
    if (isShipper) return shipperActions;
    if (order?.orderType === "WALKIN") {
      return {
        RECEIVED: ["PROCESSING"],
        PROCESSING: ["COMPLETED"],
        COMPLETED: ["DELIVERED"],
      };
    }
    return {
      RECEIVED: ["PROCESSING"],
      PROCESSING: ["DELIVERING"],
      CONFIRMED: ["PICKING_UP"],
    };
  };

  const staffActions = getStaffActions();

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start gap-2 sm:items-center sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/staff")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">
            Đơn #{params.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(order.created_at)}
          </p>
        </div>
        <Badge
          variant={
            statusBadgeVariant[order.status] as
              | "pending"
              | "delivered"
              | "cancelled"
              | "processing"
          }
          className="ml-auto shrink-0 text-xs sm:text-sm px-2 sm:px-3 py-1"
        >
          {statusLabels[order.status]}
        </Badge>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Thông tin đơn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground shrink-0">Khách hàng</span>
              <span className="font-medium text-right break-words">
                {order.customer?.fullName || "N/A"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground shrink-0">SĐT</span>
              <span className="text-right break-all">
                {order.customer?.phone || "N/A"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground shrink-0">Loại đơn</span>
              <span className="text-right">{order.orderType}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground shrink-0">Tổng tiền</span>
              <span className="font-semibold text-lg text-right">
                {formatCurrency(order.totalPrice)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground shrink-0">Thanh toán</span>
              <span className="text-right break-words">
                {order.paymentMethod}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Địa chỉ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.pickupAddress && (
              <div>
                <p className="text-sm text-muted-foreground">Lấy đồ</p>
                <p className="font-medium break-words">
                  {order.pickupAddress.addressLine}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.pickupAddress.label}
                </p>
              </div>
            )}
            {order.deliveryAddress && (
              <div>
                <p className="text-sm text-muted-foreground">Giao đồ</p>
                <p className="font-medium break-words">
                  {order.deliveryAddress.addressLine}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.deliveryAddress.label}
                </p>
              </div>
            )}
            {order.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Ghi chú</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(staffActions[order.status]?.length > 0 ||
        (!isShipper && needsWeigh) ||
        (order.status === "COMPLETED" &&
          order.paymentStatus !== "SUCCESS" &&
          canAct) ||
        (order.status === "DELIVERING" &&
          order.paymentStatus !== "SUCCESS" &&
          canAct)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" /> Thao tác
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {!isShipper && needsWeigh ? (
                <div className="w-full space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Scale className="h-5 w-5" />
                    <span>Cân đồ — nhập số lượng (kg) cho từng dịch vụ</span>
                  </div>
                  <div className="space-y-3">
                    {order.orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.price)} / {item.service.unit}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            className="w-24 text-center"
                            placeholder="0"
                            value={weighValues[item.id] ?? item.quantity ?? ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setWeighValues((prev) => ({
                                ...prev,
                                [item.id]: isNaN(val) ? 0 : val,
                              }));
                            }}
                          />
                          <span className="text-sm text-muted-foreground w-8">
                            {item.service.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between font-bold text-lg">
                    <span>Tạm tính</span>
                    <span>{formatCurrency(calcPreviewTotal())}</span>
                  </div>
                  <Button
                    className="gap-2 w-full"
                    onClick={handleWeigh}
                    disabled={weighing || Object.keys(weighValues).length === 0}
                  >
                    <Scale className="h-4 w-4" />
                    {weighing ? "Đang cân..." : "Xác nhận cân"}
                  </Button>
                </div>
              ) : order.status === "COMPLETED" &&
                order.paymentStatus !== "SUCCESS" &&
                canAct ? (
                <div className="w-full">
                  <Button
                    className="gap-2 w-full"
                    size="lg"
                    onClick={() => setShowPaymentMethod(true)}
                  >
                    <Banknote className="h-5 w-5" />
                    Thanh toán
                  </Button>
                </div>
              ) : (
                <>
                  {staffActions[order.status]?.map((nextStatus) => {
                    const needsPermission = [
                      "RECEIVED",
                      "DELIVERING",
                      "DELIVERED",
                    ].includes(nextStatus);
                    return (
                      <Button
                        key={nextStatus}
                        className="gap-2"
                        onClick={() => handleStatusUpdate(nextStatus)}
                        disabled={
                          updateStatus.isPending || (needsPermission && !canAct)
                        }
                      >
                        <CheckCircle className="h-4 w-4" />
                        {nextStatus === "PICKING_UP" && "Xác nhận lấy đồ"}
                        {nextStatus === "RECEIVED" && "Đã nhận đồ"}
                        {nextStatus === "PROCESSING" && "Bắt đầu giặt"}
                        {nextStatus === "COMPLETED" && "Hoàn tất giặt"}
                        {nextStatus === "DELIVERING" && "Bắt đầu giao"}
                        {nextStatus === "DELIVERED" && "Đã giao hàng"}
                      </Button>
                    );
                  })}
                  {order.status === "DELIVERING" &&
                    order.paymentStatus !== "SUCCESS" &&
                    canAct && (
                      <div className="w-full">
                        <Button
                          className="gap-2 w-full"
                          size="lg"
                          onClick={() => setShowPaymentMethod(true)}
                        >
                          <Banknote className="h-5 w-5" />
                          Thanh toán
                        </Button>
                      </div>
                    )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dịch vụ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {order.orderItems?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 py-1"
              >
                <div className="min-w-0">
                  <p className="font-medium">{item.service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity
                      ? `${item.quantity} ${item.service.unit}`
                      : "Chưa cân"}
                  </p>
                </div>
                <p className="font-semibold shrink-0">
                  {item.subtotal
                    ? formatCurrency(item.subtotal)
                    : formatCurrency(item.price)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lịch sử trạng thái</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.trackingLogs?.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="font-medium text-sm">
                    {statusLabels[log.status]}
                  </p>
                  {log.note && (
                    <p className="text-sm text-muted-foreground">{log.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDate(log.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {showPaymentMethod && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle className="text-lg text-center">
                Chọn phương thức thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-lg font-bold pb-3 border-b">
                <span>Tổng tiền</span>
                <span>{formatCurrency(order.totalPrice)}</span>
              </div>
              <Button
                className="w-full gap-3 justify-start h-14"
                variant="outline"
                onClick={() => handleCompleteDelivery("CASH")}
                disabled={completeDelivery.isPending}
              >
                <Banknote className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-medium">Tiền mặt</p>
                  <p className="text-xs text-muted-foreground">
                    Nhận tiền mặt tại cửa hàng
                  </p>
                </div>
              </Button>
              <Button
                className="w-full gap-3 justify-start h-14"
                variant="outline"
                onClick={() => handleCompleteDelivery("PAYOS")}
                disabled={completeDelivery.isPending}
              >
                <CreditCard className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-medium">Chuyển khoản</p>
                  <p className="text-xs text-muted-foreground">
                    Quét mã QR để thanh toán
                  </p>
                </div>
              </Button>
            </CardContent>
            <div className="px-6 pb-6">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowPaymentMethod(false)}
              >
                Hủy
              </Button>
            </div>
          </Card>
        </div>
      )}
      {payosUrl && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Thanh toán chuyển khoản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Quét mã QR để thanh toán
              </p>
              <div className="bg-white p-4 rounded-lg inline-block mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payosQr ?? payosUrl ?? "")}`}
                  alt="QR thanh toán"
                  className="mx-auto"
                  width={250}
                  height={250}
                />
              </div>
              <p className="text-xs text-muted-foreground break-all">
                {payosUrl}
              </p>
            </CardContent>
            <div className="space-y-2 px-6 pb-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setPayosUrl(null);
                  setPayosQr(null);
                }}
              >
                Đóng
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.open(payosUrl, "_blank");
                }}
              >
                Mở trang thanh toán
              </Button>
              <Button
                className="w-full gap-2"
                onClick={async () => {
                  await handleConfirmPayment();
                  setPayosUrl(null);
                  setPayosQr(null);
                }}
                disabled={confirmPayment.isPending}
              >
                <CheckCircle className="h-4 w-4" />
                Đã nhận được chuyển khoản
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
