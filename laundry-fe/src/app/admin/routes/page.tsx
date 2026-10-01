'use client';

import { useState } from 'react';
import { useStaffList } from '@/hooks/useStaff';
import { useOrders } from '@/hooks/useOrders';
import { useNavigateOrder } from '@/hooks/useRoute';
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
  Map,
  MapPin,
  Navigation,
  Route,
  Cpu,
  Loader2,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { OrderStatus, type NavigateResult } from '@/types';
import { RouteMap } from '@/components/map/RouteMap';
import { statusLabels, statusBadgeVariant } from '@/lib/utils';

export default function AdminRoutesPage() {
  const [selectedShipper, setSelectedShipper] = useState('');
  const { data: shippers } = useStaffList({ staffType: 'SHIPPER' });
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const navigateOrder = useNavigateOrder();
  const [result, setResult] = useState<NavigateResult | null>(null);

  const getDirection = (status: string): 'pickup' | 'delivery' | null => {
    if (status === OrderStatus.CONFIRMED || status === OrderStatus.PICKING_UP) return 'pickup';
    if (status === OrderStatus.COMPLETED || status === OrderStatus.DELIVERING) return 'delivery';
    return null;
  };

  const shipperOrders = orders?.filter(
    (o) => o.staff_id === selectedShipper
  ) ?? [];

  const activeOrders = shipperOrders.filter((o) => {
    const dir = getDirection(o.status);
    return dir !== null && (dir === 'pickup' ? o.pickupAddress : o.deliveryAddress);
  });

  const handleNavigate = async (orderId: string, direction: 'pickup' | 'delivery') => {
    if (!selectedShipper) return;
    try {
      const data = await navigateOrder.mutateAsync({
        shipperId: selectedShipper,
        orderId,
        direction,
      });
      setResult(data);
      toast.success(`Đã tìm đường`);
    } catch {
      toast.error('Không thể tìm đường');
    }
  };

  const handleNavigateToStore = async () => {
    if (!selectedShipper) return;
    const shipper = shippers?.find((s) => s.id === selectedShipper);
    try {
      const data = await navigateOrder.mutateAsync({
        shipperId: selectedShipper,
        orderId: '',
        direction: 'store',
        currentLat: shipper?.currentLat ?? undefined,
        currentLng: shipper?.currentLng ?? undefined,
      });
      setResult(data);
      toast.success('Đã tìm đường về cửa hàng');
    } catch {
      toast.error('Không thể tìm đường');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chỉ đường cho shipper</h1>
        <p className="text-muted-foreground mt-1">Chọn shipper và đơn hàng để xem đường đi ngắn nhất</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5" /> Chọn shipper
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-sm">
            <Select value={selectedShipper} onValueChange={(v) => { setSelectedShipper(v); setResult(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn shipper" />
              </SelectTrigger>
              <SelectContent>
                {shippers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fullName} {s.isAvailable ? '' : '(offline)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedShipper && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Đơn hàng ({activeOrders.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleNavigateToStore}
                disabled={navigateOrder.isPending}
              >
                <Store className="h-4 w-4" /> Về cửa hàng
              </Button>
            </div>

            {ordersLoading && (
              <Card><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
            )}

            {!ordersLoading && activeOrders.length === 0 && (
              <Card className="p-8 text-center text-muted-foreground">
                Shipper này không có đơn hàng cần xử lý
              </Card>
            )}

            {activeOrders.map((order) => {
              const dir = getDirection(order.status)!;
              const addr = dir === 'pickup' ? order.pickupAddress : order.deliveryAddress;
              const isLoadingThis = navigateOrder.isPending;

              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">Đơn #{order.id.slice(0, 8)}</p>
                          <Badge variant={(statusBadgeVariant[order.status] || 'outline') as any}>
                            {statusLabels[order.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.customer?.fullName} - {order.customer?.phone}
                        </p>
                        {addr && (
                          <div className="flex items-start gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="truncate">{addr.addressLine}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 gap-1.5"
                        disabled={navigateOrder.isPending}
                        onClick={() => handleNavigate(order.id, dir)}
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

          <div>
            {navigateOrder.isPending && (
              <Card>
                <CardContent className="p-8 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            )}

            {result && !navigateOrder.isPending && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Route className="h-5 w-5" /> Đường đi ngắn nhất
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" />
                        <span>Thuật toán: <strong>{result.source}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>Khoảng cách: <strong>{result.data.distance} km</strong></span>
                      </div>
                      {result.data.visitedNodes !== undefined && (
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-primary" />
                          <span>Node đã thăm: <strong>{result.data.visitedNodes}</strong></span>
                        </div>
                      )}
                      {result.data.executionTimeMs !== undefined && (
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-primary" />
                          <span>Thời gian: <strong>{result.data.executionTimeMs} ms</strong></span>
                        </div>
                      )}
                    </div>

                    {result.address && (
                      <div className="text-sm">
                        <span className="font-medium">Điểm đến:</span>
                        <p className="text-muted-foreground">{result.address.label} — {result.address.addressLine}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <RouteMap
                      stops={[{
                        orderId: result.order?.id ?? '',
                        address: {
                          id: result.address?.id ?? '',
                          label: 'Vị trí hiện tại',
                          addressLine: 'Shipper',
                          latitude: result.shipperPosition?.lat ?? 0,
                          longitude: result.shipperPosition?.lng ?? 0,
                          isDefault: false,
                        },
                        type: 'pickup',
                        order: 1,
                      }, {
                        orderId: result.order?.id ?? '',
                        address: {
                          id: result.address?.id ?? '',
                          label: result.address?.label ?? 'Điểm đến',
                          addressLine: result.address?.addressLine ?? '',
                          latitude: result.destination?.lat ?? 0,
                          longitude: result.destination?.lng ?? 0,
                          isDefault: false,
                        },
                        type: 'delivery',
                        order: 2,
                      }]}
                      legs={[{
                        fromIdx: 0,
                        toIdx: 1,
                        path: result.data.path,
                        distance: result.data.distance,
                        source: result.source,
                      }]}
                      height="350px"
                    />
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-0.5 bg-blue-500 inline-block" /> MapVina
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-0.5 bg-yellow-500 inline-block" /> Dijkstra
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-0.5 bg-red-500 inline-block" /> Haversine
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!result && !navigateOrder.isPending && (
              <Card className="p-12 text-center h-full flex flex-col items-center justify-center">
                <Map className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium">Chưa chọn đơn hàng</p>
                <p className="text-sm text-muted-foreground">
                  Bấm &ldquo;Chỉ đường&rdquo; trên đơn hàng để xem đường đi ngắn nhất
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {!selectedShipper && (
        <Card className="p-12 text-center">
          <Map className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium">Chọn shipper</p>
          <p className="text-sm text-muted-foreground">Chọn một shipper để xem danh sách đơn hàng</p>
        </Card>
      )}
    </div>
  );
}
