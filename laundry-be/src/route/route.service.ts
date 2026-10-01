import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, OrderType } from '@prisma/client';
import { OsmService } from '../osm/osm.service';
import { RouteLeg } from '../osm/interfaces/graph.interface';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface NavigateResult {
  success: boolean;
  data: {
    path: LatLng[];
    distance: number;
    visitedNodes?: number;
    executionTimeMs?: number;
    algorithm: string;
  };
  source: string;
  shipperPosition: LatLng;
  destination: LatLng;
  address: {
    id: string;
    label: string;
    addressLine: string;
    latitude: number;
    longitude: number;
  };
  order?: {
    id: string;
    status: string;
  };
}

export interface Stop {
  orderId: string;
  address: {
    id: string;
    label: string;
    addressLine: string;
    latitude: number;
    longitude: number;
  };
  type: 'pickup' | 'delivery';
  order: number;
}

export interface RouteResult {
  stops: Stop[];
  totalDistance: number;
  legs?: RouteLeg[];
}

@Injectable()
export class RouteService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => OsmService))
    private osmService: OsmService,
  ) {}

  async findShortestPath(from: LatLng, to: LatLng): Promise<{
    path: LatLng[];
    distance: number;
    source: 'dijkstra';
  }> {
    const osmResult = this.osmService?.findShortestPath?.(from, to);
    if (!osmResult) {
      throw new ServiceUnavailableException(
        'Hệ thống định tuyến Dijkstra chưa sẵn sàng, vui lòng thử lại sau',
      );
    }

    return {
      path: osmResult.path,
      distance: osmResult.distance,
      source: 'dijkstra',
    };
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private getStorePosition(): LatLng {
    const storeLat = parseFloat(process.env.STORE_LAT || '10.03');
    const storeLng = parseFloat(process.env.STORE_LNG || '105.77');
    return { lat: storeLat, lng: storeLng };
  }

  private async getShipperPosition(shipperId: string): Promise<LatLng> {
    const shipper = await this.prisma.user.findUnique({
      where: { id: shipperId },
    });
    if (!shipper) throw new NotFoundException('Shipper không tồn tại');

    if (
      shipper.locationUpdatedAt &&
      Date.now() - shipper.locationUpdatedAt.getTime() < 30 * 60 * 1000 &&
      shipper.currentLat != null &&
      shipper.currentLng != null
    ) {
      return { lat: shipper.currentLat, lng: shipper.currentLng };
    }

    const lastOrder = await this.prisma.order.findFirst({
      where: {
        staff_id: shipperId,
        status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
      },
      include: { deliveryAddress: true, pickupAddress: true },
      orderBy: { updated_at: 'desc' },
    });

    if (lastOrder?.deliveryAddress) {
      return {
        lat: lastOrder.deliveryAddress.latitude,
        lng: lastOrder.deliveryAddress.longitude,
      };
    }
    if (lastOrder?.pickupAddress) {
      return {
        lat: lastOrder.pickupAddress.latitude,
        lng: lastOrder.pickupAddress.longitude,
      };
    }

    return { lat: 10.8231, lng: 106.6297 };
  }

  private nearestNeighbor(
    start: LatLng,
    points: { orderId: string; address: any; type: 'pickup' | 'delivery' }[],
  ): { orderId: string; address: any; type: 'pickup' | 'delivery' }[] {
    const unvisited = [...points];
    const route: { orderId: string; address: any; type: 'pickup' | 'delivery' }[] = [];
    let current = start;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = this.haversine(
          current.lat,
          current.lng,
          unvisited[i].address.latitude,
          unvisited[i].address.longitude,
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const nearest = unvisited.splice(nearestIdx, 1)[0];
      route.push(nearest);
      current = {
        lat: nearest.address.latitude,
        lng: nearest.address.longitude,
      };
    }

    return route;
  }

  private twoOpt(
    stops: { orderId: string; address: any; type: 'pickup' | 'delivery' }[],
  ): { orderId: string; address: any; type: 'pickup' | 'delivery' }[] {
    let improved = true;
    let best = [...stops];

    while (improved) {
      improved = false;
      for (let i = 1; i < best.length - 1; i++) {
        for (let j = i + 1; j < best.length; j++) {
          const newRoute = this.swap(best, i, j);
          const currentDist = this.totalDistance(best);
          const newDist = this.totalDistance(newRoute);
          if (newDist < currentDist) {
            best = newRoute;
            improved = true;
          }
        }
      }
    }

    return best;
  }

  private swap(
    arr: { orderId: string; address: any; type: 'pickup' | 'delivery' }[],
    i: number,
    j: number,
  ): { orderId: string; address: any; type: 'pickup' | 'delivery' }[] {
    const result = [...arr];
    const segment = result.slice(i, j + 1).reverse();
    result.splice(i, segment.length, ...segment);
    return result;
  }

  private totalDistance(
    stops: { orderId: string; address: any }[],
    start?: LatLng,
  ): number {
    let total = 0;
    let prev = start ?? {
      lat: stops[0].address.latitude,
      lng: stops[0].address.longitude,
    };

    for (const stop of stops) {
      total += this.haversine(prev.lat, prev.lng, stop.address.latitude, stop.address.longitude);
      prev = { lat: stop.address.latitude, lng: stop.address.longitude };
    }

    return total;
  }

  async optimize(shipperId: string): Promise<RouteResult> {
    const orders = await this.prisma.order.findMany({
      where: {
        staff_id: shipperId,
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.PICKING_UP,
            OrderStatus.COMPLETED,
            OrderStatus.DELIVERING,
          ],
        },
      },
      include: { pickupAddress: true, deliveryAddress: true },
    });

    const points: { orderId: string; address: any; type: 'pickup' | 'delivery' }[] = [];

    for (const order of orders) {
      if (
        order.pickupAddress &&
        (order.status === OrderStatus.CONFIRMED ||
          order.status === OrderStatus.PICKING_UP)
      ) {
        points.push({
          orderId: order.id,
          address: order.pickupAddress,
          type: 'pickup',
        });
      }
      if (
        order.deliveryAddress &&
        (order.status === OrderStatus.COMPLETED ||
          order.status === OrderStatus.DELIVERING)
      ) {
        points.push({
          orderId: order.id,
          address: order.deliveryAddress,
          type: 'delivery',
        });
      }
    }

    if (points.length === 0) {
      return { stops: [], totalDistance: 0 };
    }

    const start = await this.getShipperPosition(shipperId);
    let route = this.nearestNeighbor(start, points);
    if (route.length > 3) {
      route = this.twoOpt(route);
    }

    const stops: Stop[] = route.map((p, idx) => ({
      orderId: p.orderId,
      address: {
        id: p.address.id,
        label: p.address.label,
        addressLine: p.address.addressLine,
        latitude: p.address.latitude,
        longitude: p.address.longitude,
      },
      type: p.type,
      order: idx + 1,
    }));

    const totalDistance = this.totalDistance(stops, start);

    const legs: RouteLeg[] = [];
    let cumulative = 0;

    for (let i = 1; i < stops.length; i++) {
      const prev = stops[i - 1].address;
      const curr = stops[i].address;

      const legResult = await this.findShortestPath(
        { lat: prev.latitude, lng: prev.longitude },
        { lat: curr.latitude, lng: curr.longitude },
      );

      legs.push({
        fromIdx: i - 1,
        toIdx: i,
        path: legResult.path,
        distance: legResult.distance,
        source: legResult.source,
      });
      cumulative += legResult.distance;
    }

    return {
      stops,
      totalDistance: Math.round(cumulative * 100) / 100,
      legs,
    };
  }

  async navigate(
    shipperId: string,
    orderId: string,
    direction: 'pickup' | 'delivery' | 'store',
    currentLat?: number,
    currentLng?: number,
  ): Promise<NavigateResult> {
    const shipperPos =
      currentLat !== undefined && currentLng !== undefined
        ? { lat: currentLat, lng: currentLng }
        : await this.getShipperPosition(shipperId);

    let destination: LatLng;
    let address: NavigateResult['address'];
    let order: NavigateResult['order'];

    if (direction === 'store') {
      const store = this.getStorePosition();
      destination = store;
      address = {
        id: 'store',
        label: 'Cửa hàng',
        addressLine: 'Cửa hàng',
        latitude: store.lat,
        longitude: store.lng,
      };
      order = undefined;
    } else {
      const orderRecord = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { pickupAddress: true, deliveryAddress: true },
      });
      if (!orderRecord) throw new NotFoundException('Đơn hàng không tồn tại');

      const addressRecord =
        direction === 'pickup' ? orderRecord.pickupAddress : orderRecord.deliveryAddress;
      if (!addressRecord) throw new NotFoundException('Địa chỉ không tồn tại');

      destination = {
        lat: addressRecord.latitude,
        lng: addressRecord.longitude,
      };
      address = {
        id: addressRecord.id,
        label: addressRecord.label,
        addressLine: addressRecord.addressLine,
        latitude: addressRecord.latitude,
        longitude: addressRecord.longitude,
      };
      order = { id: orderRecord.id, status: orderRecord.status };
    }

    const result = await this.findShortestPath(shipperPos, destination);

    return {
      success: true,
      data: {
        path: result.path,
        distance: result.distance,
        algorithm: result.source,
      },
      source: result.source,
      shipperPosition: shipperPos,
      destination,
      address,
      order,
    };
  }

  async findNearestShipper(addressId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address) throw new NotFoundException('Địa chỉ không tồn tại');

    const shippers = await this.prisma.user.findMany({
      where: {
        role: 'STAFF',
        staffType: 'SHIPPER',
        isAvailable: true,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        currentLat: true,
        currentLng: true,
        locationUpdatedAt: true,
      },
    });

    const withDistance = shippers.map((s) => {
      let lat: number;
      let lng: number;

      if (
        s.locationUpdatedAt &&
        Date.now() - s.locationUpdatedAt.getTime() < 30 * 60 * 1000 &&
        s.currentLat != null &&
        s.currentLng != null
      ) {
        lat = s.currentLat;
        lng = s.currentLng;
      } else {
        lat = address.latitude;
        lng = address.longitude;
      }

      const distance = this.haversine(
        address.latitude,
        address.longitude,
        lat,
        lng,
      );
      return { ...s, distance: Math.round(distance * 100) / 100 };
    });

    withDistance.sort((a, b) => a.distance - b.distance);

    return withDistance;
  }
}
