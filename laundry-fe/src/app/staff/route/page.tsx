"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useOrders } from "@/hooks/useOrders";
import { useNavigateOrder } from "@/hooks/useRoute";
import { useUpdateLocation } from "@/hooks/useStaff";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Map,
  MapPin,
  Navigation,
  Cpu,
  Loader2,
  Crosshair,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { OrderStatus, type NavigateResult } from "@/types";
import { RouteMap } from "@/components/map/RouteMap";
import { statusLabels, statusBadgeVariant } from "@/lib/utils";

export default function StaffRoutePage() {
  const { user } = useAuthStore();
  const { data: orders, isLoading } = useOrders();
  const navigateOrder = useNavigateOrder();
  const updateLocation = useUpdateLocation();
  const socketRef = useSocket(undefined, user?.id);
  const [result, setResult] = useState<NavigateResult | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [navMode, setNavMode] = useState<"order" | "store" | null>(null);

  const [shipperPosition, setShipperPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [liveSince, setLiveSince] = useState<Date | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number } | null>(null);
  const positionRef = useRef<{ lat: number; lng: number } | null>(null);
  const resultRef = useRef<NavigateResult | null>(null);
  const lastRouteRefreshRef = useRef(0);
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    positionRef.current = shipperPosition;
  }, [shipperPosition]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  const getDirection = (status: string): "pickup" | "delivery" | null => {
    if (status === OrderStatus.CONFIRMED || status === OrderStatus.PICKING_UP)
      return "pickup";
    if (status === OrderStatus.COMPLETED || status === OrderStatus.DELIVERING)
      return "delivery";
    return null;
  };

  const handleNavigate = async (
    orderId: string,
    direction: "pickup" | "delivery",
  ) => {
    if (!user?.id) return;
    setSelectedOrderId(orderId);
    setNavMode("order");
    try {
      const data = await navigateOrder.mutateAsync({
        shipperId: user.id,
        orderId,
        direction,
        currentLat: shipperPosition?.lat,
        currentLng: shipperPosition?.lng,
      });
      setResult(data);
      toast.success(`Đã tìm đường`);
    } catch {
      toast.error("Không thể tìm đường");
    }
  };

  const handleNavigateToStore = async () => {
    if (!user?.id) return;
    setNavMode("store");
    try {
      const data = await navigateOrder.mutateAsync({
        shipperId: user.id,
        orderId: "",
        direction: "store",
        currentLat: shipperPosition?.lat,
        currentLng: shipperPosition?.lng,
      });
      setResult(data);
      toast.success("Đã tìm đường về cửa hàng");
    } catch {
      toast.error("Không thể tìm đường");
    }
  };

  const refreshRoute = useCallback(
    async (position?: { lat: number; lng: number }) => {
      if (!user?.id || !navMode) return;
      const pos = position ?? positionRef.current;
      const currentLat = pos?.lat;
      const currentLng = pos?.lng;

      if (navMode === "store") {
        try {
          const data = await navigateOrder.mutateAsync({
            shipperId: user.id,
            orderId: "",
            direction: "store",
            currentLat,
            currentLng,
          });
          setResult(data);
        } catch {}
        return;
      }

      if (!selectedOrderId) return;
      const order = orders?.find((o) => o.id === selectedOrderId);
      if (!order) return;
      const dir = getDirection(order.status);
      if (!dir) return;
      try {
        const data = await navigateOrder.mutateAsync({
          shipperId: user.id,
          orderId: selectedOrderId,
          direction: dir,
          currentLat,
          currentLng,
        });
        setResult(data);
      } catch {}
    },
    [user?.id, navMode, selectedOrderId, orders, navigateOrder],
  );

  const startGps = useCallback(() => {
    if (!navigator.geolocation) return;

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          const prev = lastSentRef.current;
          const next = { lat, lng };
          setShipperPosition(next);
          positionRef.current = next;
          setGpsAccuracy(accuracy);
          if (!liveSince) setLiveSince(new Date());

          if (
            prev &&
            Math.abs(prev.lat - lat) < 0.0005 &&
            Math.abs(prev.lng - lng) < 0.0005
          ) {
            return;
          }

          lastSentRef.current = next;
          updateLocation.mutate(
            { lat, lng },
            {
              onError: () => {},
            },
          );

          if (resultRef.current && prev) {
            const dx = prev.lat - lat;
            const dy = prev.lng - lng;
            const movedKm = Math.sqrt(dx * dx + dy * dy) * 111;
            const now = Date.now();
            if (movedKm > 0.02 && now - lastRouteRefreshRef.current > 2000) {
              lastRouteRefreshRef.current = now;
              refreshRoute(next);
            }
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 3000 },
      );
    };

    sendLocation();
    gpsIntervalRef.current = setInterval(sendLocation, 2000);

    return () => {
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
        gpsIntervalRef.current = null;
      }
    };
  }, [updateLocation, liveSince, refreshRoute]);

  useEffect(() => {
    const cleanup = startGps();
    return () => cleanup?.();
  }, [startGps]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleLocation = (payload: {
      staffId: string;
      lat: number;
      lng: number;
    }) => {
      if (payload.staffId === user?.id) {
        setShipperPosition({ lat: payload.lat, lng: payload.lng });
      }
    };

    socket.on("location-updated", handleLocation);
    return () => {
      socket.off("location-updated", handleLocation);
    };
  }, [socketRef, user?.id]);

  const activeOrders =
    orders?.filter((o) => {
      const dir = getDirection(o.status);
      return (
        dir !== null && (dir === "pickup" ? o.pickupAddress : o.deliveryAddress)
      );
    }) ?? [];

  const gpsAge = liveSince
    ? Math.round((Date.now() - liveSince.getTime()) / 1000)
    : null;
  const gpsColor =
    gpsAge !== null && gpsAge < 30
      ? "text-green-500"
      : gpsAge !== null && gpsAge < 120
        ? "text-yellow-500"
        : "text-red-500";

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Chỉ đường
          </h1>
          <p className="text-muted-foreground mt-1">
            Chọn đơn hàng để xem đường đi ngắn nhất
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleNavigateToStore}
            disabled={navigateOrder.isPending}
          >
            <Store className="h-4 w-4" /> Về cửa hàng
          </Button>
          {gpsAccuracy !== null && (
            <div className={`flex items-center gap-1.5 text-xs ${gpsColor}`}>
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${gpsColor === "text-green-500" ? "bg-green-500" : "bg-yellow-500"}`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${gpsColor === "text-green-500" ? "bg-green-500" : "bg-yellow-500"}`}
                />
              </span>
              GPS {(gpsAccuracy / 1000).toFixed(1)}km
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && activeOrders.length === 0 && (
        <Card className="p-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium">Không có đơn hàng cần xử lý</p>
          <p className="text-sm text-muted-foreground">
            Các đơn đang chờ hoặc đang giao sẽ hiển thị ở đây
          </p>
        </Card>
      )}

      {activeOrders.length > 0 && (
        <div className="space-y-4">
          {result && !navigateOrder.isPending && (
            <Card className="overflow-hidden">
              <div className="relative">
                <div className="absolute top-2 left-2 right-2 z-10 flex flex-wrap gap-1.5 pr-10 sm:top-3 sm:left-3 sm:right-auto sm:gap-2 sm:pr-0">
                  <span className="bg-background/90 backdrop-blur px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 shadow-xs sm:px-2.5 sm:text-xs sm:gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    {result.source}
                  </span>
                  <span className="bg-background/90 backdrop-blur px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 shadow-xs sm:px-2.5 sm:text-xs sm:gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {result.data.distance} km
                  </span>
                  {result.data.visitedNodes !== undefined && (
                    <span className="bg-background/90 backdrop-blur px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 shadow-xs sm:px-2.5 sm:text-xs sm:gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-primary" />
                      {result.data.visitedNodes} nodes
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3 z-10">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1.5 text-xs shadow-xs bg-background/90 backdrop-blur px-2"
                    onClick={() => refreshRoute()}
                    disabled={navigateOrder.isPending}
                  >
                    <Crosshair className="h-3.5 w-3.5" /> Cập nhật
                  </Button>
                </div>
                <RouteMap
                  stops={[
                    {
                      orderId: result.order?.id ?? "",
                      address: {
                        id: result.address?.id ?? "",
                        label: "Vị trí hiện tại",
                        addressLine: "Shipper",
                        latitude: result.shipperPosition?.lat ?? 0,
                        longitude: result.shipperPosition?.lng ?? 0,
                        isDefault: false,
                      },
                      type: "pickup",
                      order: 1,
                    },
                    {
                      orderId: result.order?.id ?? "",
                      address: {
                        id: result.address?.id ?? "",
                        label: result.address?.label ?? "Điểm đến",
                        addressLine: result.address?.addressLine ?? "",
                        latitude: result.destination?.lat ?? 0,
                        longitude: result.destination?.lng ?? 0,
                        isDefault: false,
                      },
                      type: "delivery",
                      order: 2,
                    },
                  ]}
                  legs={[
                    {
                      fromIdx: 0,
                      toIdx: 1,
                      path: result.data.path,
                      distance: result.data.distance,
                      source: result.source,
                    },
                  ]}
                  shipperPosition={shipperPosition}
                  liveLabel="Vị trí real-time"
                  height="clamp(300px, 52vw, 400px)"
                />
              </div>
            </Card>
          )}

          {!result && !navigateOrder.isPending && (
            <Card className="p-12 text-center">
              <Map className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium">Chưa chọn đơn hàng</p>
              <p className="text-sm text-muted-foreground">
                Bấm &quot;Chỉ đường&quot; trên đơn hàng bên dưới
              </p>
            </Card>
          )}

          {navigateOrder.isPending && (
            <Card className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Đang tìm đường...</p>
            </Card>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-3">
              Đơn hàng ({activeOrders.length})
            </h2>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {activeOrders.map((order) => {
                const dir = getDirection(order.status)!;
                const addr =
                  dir === "pickup"
                    ? order.pickupAddress
                    : order.deliveryAddress;
                const isSelected = selectedOrderId === order.id;
                const isLoadingThis = navigateOrder.isPending && isSelected;

                return (
                  <Card
                    key={order.id}
                    className={`min-w-0 max-w-full overflow-hidden cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium truncate">
                              Đơn #{order.id.slice(0, 8)}
                            </p>
                            <Badge
                              variant={
                                (statusBadgeVariant[order.status] ||
                                  "outline") as any
                              }
                            >
                              {statusLabels[order.status]}
                            </Badge>
                          </div>
                          <p className="min-w-0 break-words text-sm text-muted-foreground">
                            {order.customer?.fullName} - {order.customer?.phone}
                          </p>
                          {addr && (
                            <div className="flex items-start gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span className="min-w-0 break-words">
                                {addr.addressLine}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="w-full max-w-full shrink-0 gap-1.5 sm:w-auto"
                          disabled={navigateOrder.isPending && isSelected}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(order.id, dir);
                          }}
                        >
                          {isLoadingThis ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Navigation className="h-4 w-4" />
                          )}
                          Chỉ đường
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
