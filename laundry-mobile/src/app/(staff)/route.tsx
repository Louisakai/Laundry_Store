import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { MapView } from '@/components/map/map-view';
import { useAuthStore } from '@/stores/authStore';
import { useMyOrders, useOptimizeRoute, useNavigate, useUpdateLocation } from '@/hooks/useStaff';
import { useSocket } from '@/hooks/useSocket';
import { getApiErrorMessage } from '@/api/client';
import type { LatLng, RouteResult } from '@/types';

type NavDirection = 'pickup' | 'delivery' | 'store';

export default function StaffRouteScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: orders } = useMyOrders();
  const optimizeRoute = useOptimizeRoute();
  const navigate = useNavigate();
  const updateLocation = useUpdateLocation();

  const [route, setRoute] = useState<RouteResult | null>(null);
  const [navigateData, setNavigateData] = useState<{ path: LatLng[]; orderId: string } | null>(null);
  const [shipperPosition, setShipperPosition] = useState<LatLng | null>(
    user?.currentLat && user?.currentLng ? { lat: user.currentLat, lng: user.currentLng } : null,
  );

  const navTargetRef = useRef<{ orderId: string; direction: NavDirection } | null>(null);
  const positionRef = useRef<LatLng | null>(shipperPosition);
  const lastSentRef = useRef<LatLng | null>(null);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    positionRef.current = shipperPosition;
  }, [shipperPosition]);

  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const onLocationUpdated = (payload: { lat: number; lng: number }) => {
      setShipperPosition({ lat: payload.lat, lng: payload.lng });
    };
    socket.on('location-updated', onLocationUpdated);
    return () => {
      socket.off('location-updated', onLocationUpdated);
    };
  }, [socket]);

  const runNavigate = useCallback(
    async (target: { orderId: string; direction: NavDirection }, position?: LatLng) => {
      if (!user?.id) return;
      const pos = position ?? positionRef.current;
      try {
        const res = await navigate.mutateAsync({
          shipperId: user.id,
          orderId: target.orderId,
          direction: target.direction,
          currentLat: pos?.lat,
          currentLng: pos?.lng,
        });
        setNavigateData({ path: res.data.path, orderId: target.orderId });
        setRoute(null);
      } catch {
        // Giữ kết quả hiện tại khi refresh thất bại
      }
    },
    [user, navigate],
  );

  const runNavigateRef = useRef(runNavigate);
  useEffect(() => {
    runNavigateRef.current = runNavigate;
  });

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const next: LatLng = { lat, lng };
          setShipperPosition(next);
          positionRef.current = next;

          const prev = lastSentRef.current;
          if (
            !prev ||
            Math.abs(prev.lat - lat) > 0.0001 ||
            Math.abs(prev.lng - lng) > 0.0001
          ) {
            lastSentRef.current = next;
            updateLocation.mutate({ lat, lng });
          }

          const target = navTargetRef.current;
          if (target && prev) {
            const dx = prev.lat - lat;
            const dy = prev.lng - lng;
            const movedKm = Math.sqrt(dx * dx + dy * dy) * 111;
            const now = Date.now();
            if (movedKm > 0.02 && now - lastRefreshRef.current > 2000) {
              lastRefreshRef.current = now;
              runNavigateRef.current(target, next);
            }
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [updateLocation]);

  const activeCount = (orders || []).length;

  const handleOptimize = async () => {
    if (!user?.id) return;
    try {
      const result = await optimizeRoute.mutateAsync(user.id);
      setRoute(result);
      setNavigateData(null);
      navTargetRef.current = null;
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
  };

  const handleNavigate = async (orderId: string, direction: 'pickup' | 'delivery') => {
    if (!user?.id) return;
    const target = { orderId, direction };
    navTargetRef.current = target;
    try {
      const res = await navigate.mutateAsync({
        shipperId: user.id,
        orderId,
        direction,
        currentLat: shipperPosition?.lat,
        currentLng: shipperPosition?.lng,
      });
      setNavigateData({ path: res.data.path, orderId });
      setRoute(null);
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
  };

  const handleNavigateToStore = async () => {
    if (!user?.id) return;
    const target = { orderId: '', direction: 'store' as NavDirection };
    navTargetRef.current = target;
    try {
      const res = await navigate.mutateAsync({
        shipperId: user.id,
        orderId: '',
        direction: 'store',
        currentLat: shipperPosition?.lat,
        currentLng: shipperPosition?.lng,
      });
      setNavigateData({ path: res.data.path, orderId: '' });
      setRoute(null);
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
  };

  const markers = [];
  if (navigateData) {
    markers.push({
      id: 'shipper',
      coordinate: shipperPosition ?? { lat: 10.03, lng: 105.77 },
      color: '#0a7b7b',
    });
    markers.push({
      id: 'dest',
      coordinate: navigateData.path[navigateData.path.length - 1],
      color: '#dc2626',
    });
  } else if (route) {
    route.stops.forEach((stop, i) => {
      markers.push({
        id: stop.orderId,
        coordinate: { lat: stop.address.latitude, lng: stop.address.longitude },
        color: stop.type === 'pickup' ? '#16a34a' : '#0a7b7b',
        label: `${i + 1}. ${stop.type === 'pickup' ? 'Lấy' : 'Giao'}`,
      });
    });
    if (shipperPosition) markers.push({ id: 'shipper', coordinate: shipperPosition, color: '#7c3aed' });
  }

  const mapCoords = navigateData
    ? navigateData.path
    : route
      ? [
          ...(shipperPosition ? [shipperPosition] : []),
          ...route.stops.map((s) => ({ lat: s.address.latitude, lng: s.address.longitude })),
        ]
      : [];

  return (
    <Screen scroll={false}>
      <View className="h-[38%] overflow-hidden">
        {activeCount > 0 ? (
          <MapView
            markers={markers}
            routePath={navigateData?.path}
            fitBounds={
              mapCoords.length > 1
                ? { coords: mapCoords, padding: 60 }
                : mapCoords.length === 1
                  ? { coords: [mapCoords[0], mapCoords[0]], padding: 60 }
                  : undefined
            }
            center={mapCoords[0]}
          />
        ) : (
          <EmptyState icon="map-outline" title="Không có đơn hoạt động" />
        )}
      </View>

      <View className="flex-1 p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text variant="subtitle">Tuyến giao nhận</Text>
          <Text variant="caption">{activeCount} đơn hoạt động</Text>
        </View>

        {activeCount === 0 ? (
          <EmptyState icon="checkmark-done-outline" title="Hôm nay không có đơn" />
        ) : (
          <>
            <View className="mb-3 flex-row gap-2">
              <View className="flex-1">
                <Button
                  title={route ? 'Tối ưu lại tuyến' : 'Tối ưu tuyến đường'}
                  loading={optimizeRoute.isPending}
                  onPress={handleOptimize}
                />
              </View>
              <Button
                title="Về cửa hàng"
                variant="outline"
                loading={navigate.isPending}
                onPress={handleNavigateToStore}
              />
            </View>

            {route?.stops.length ? (
              <View className="gap-2">
                <Text variant="caption" className="text-ink-secondary">
                  Tổng khoảng cách: {(route.totalDistance ?? 0).toFixed(1)} km
                </Text>
                {route.stops.map((stop, i) => (
                  <Card key={stop.orderId} className="flex-row items-center gap-3 p-3">
                    <View
                      className={`h-7 w-7 items-center justify-center rounded-full ${
                        stop.type === 'pickup' ? 'bg-green-100' : 'bg-brand-100'
                      }`}>
                      <Text variant="caption" bold>
                        {i + 1}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text variant="small" bold>
                        {stop.type === 'pickup' ? 'Đi lấy đồ' : 'Đi giao đồ'}
                      </Text>
                      <Text variant="caption" numberOfLines={1}>
                        {stop.address.addressLine}
                      </Text>
                    </View>
                    <Button
                      title="Chỉ đường"
                      variant="outline"
                      className="px-3 py-2"
                      loading={navigate.isPending}
                      onPress={() => handleNavigate(stop.orderId, stop.type)}
                    />
                  </Card>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="map-outline"
                title="Chưa có tuyến"
                description="Nhấn 'Tối ưu tuyến đường' để sắp xếp các chặng"
              />
            )}
          </>
        )}
      </View>
    </Screen>
  );
}