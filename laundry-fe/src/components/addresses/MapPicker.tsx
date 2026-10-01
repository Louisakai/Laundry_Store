'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'leaflet/dist/leaflet.css';
import 'mapvina-gl/dist/mapvina-gl.css';
import { MapVinaAutocomplete } from './MapVinaAutocomplete';
import { reverse as mapvinaReverse, setMapVinaKey, MAPVINA_STYLE } from '@/lib/mapvina';

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  onAddressResolve?: (address: string) => void;
  addressLine?: string;
  height?: string;
}

const DEFAULT_CENTER = { lat: 10.03, lng: 105.77 };

async function nominatimReverse(lat: number, lng: number) {
  return fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`,
  ).then((r) => r.json());
}

async function doReverseGeo(lat: number, lng: number): Promise<string | null> {
  try {
    const result = await mapvinaReverse(lat, lng);
    if (result?.formatted_address) return result.formatted_address;
  } catch { /* fallback */ }
  try {
    const data = await nominatimReverse(lat, lng);
    if (data?.display_name) return data.display_name;
  } catch { /* silent */ }
  return null;
}

function createPinSvg(): HTMLDivElement {
  const el = document.createElement('div');
  el.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#fff" stroke="#ef4444"/></svg>';
  el.style.cursor = 'grab';
  return el;
}

export function MapPicker({
  latitude,
  longitude,
  onLocationChange,
  onAddressResolve,
  addressLine,
  height = '300px',
}: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mvRef = useRef<{ map: any; marker: any; mvgl: any } | null>(null);
  const leafletRef = useRef<{ map: any; marker: any; L: any } | null>(null);
  const [searchQuery, setSearchQuery] = useState(addressLine || '');
  const [loading, setLoading] = useState(true);
  const [engine, setEngine] = useState<'mapvina' | 'leaflet' | null>(null);
  const mvKey = process.env.NEXT_PUBLIC_MAPVINA_API_KEY || '';

  const locCbRef = useRef(onLocationChange);
  const addrCbRef = useRef(onAddressResolve);
  useEffect(() => { locCbRef.current = onLocationChange; }, [onLocationChange]);
  useEffect(() => { addrCbRef.current = onAddressResolve; }, [onAddressResolve]);

  const onMarkerDrag = useCallback(async (lat: number, lng: number) => {
    locCbRef.current(lat, lng);
    const addr = await doReverseGeo(lat, lng);
    if (addr) { setSearchQuery(addr); addrCbRef.current?.(addr); }
  }, []);

  const onMapClick = useCallback(async (lat: number, lng: number) => {
    locCbRef.current(lat, lng);
    markerMoveTo(lat, lng);
    const addr = await doReverseGeo(lat, lng);
    if (addr) { setSearchQuery(addr); addrCbRef.current?.(addr); }
  }, []);

  const markerMoveTo = (lat: number, lng: number) => {
    if (mvRef.current) {
      const { map, marker, mvgl } = mvRef.current;
      if (marker) {
        marker.setLngLat([lng, lat]);
      } else {
        const m = new mvgl.Marker({ element: createPinSvg(), draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);
        m.on('dragend', () => {
          const p = m.getLngLat();
          onMarkerDrag(p.lat, p.lng);
        });
        mvRef.current.marker = m;
      }
    } else if (leafletRef.current) {
      const { map, marker, L } = leafletRef.current;
      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        const m = L.marker([lat, lng], { draggable: true }).addTo(map);
        m.on('dragend', () => {
          const p = m.getLatLng();
          onMarkerDrag(p.lat, p.lng);
        });
        leafletRef.current.marker = m;
      }
    }
  };

  const goToLocation = (lat: number, lng: number, zoom = 16) => {
    if (mvRef.current) {
      mvRef.current.map.flyTo({ center: [lng, lat], zoom });
    } else if (leafletRef.current) {
      leafletRef.current.map.setView([lat, lng], zoom);
    }
    markerMoveTo(lat, lng);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!mapContainerRef.current) return;

      try {
        const mapvinagl = await import('mapvina-gl');
        if (cancelled || !mapContainerRef.current) return;

        const center = latitude && longitude
          ? { lat: latitude, lng: longitude }
          : DEFAULT_CENTER;

        const map = new mapvinagl.Map({
          container: mapContainerRef.current,
          style: `${MAPVINA_STYLE}${mvKey}`,
          center,
          zoom: latitude && longitude ? 15 : 12,
        });

        map.addControl(new mapvinagl.NavigationControl(), 'top-right');

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 15000);
          map.once('load', () => { clearTimeout(timeout); resolve(); });
          map.once('error', () => { clearTimeout(timeout); reject(new Error('error')); });
        });

        if (cancelled) { map.remove(); return; }

        mvRef.current = { map, marker: null, mvgl: mapvinagl };
        setEngine('mapvina');

        if (latitude && longitude) {
          const m = new mapvinagl.Marker({ element: createPinSvg(), draggable: true })
            .setLngLat([longitude, latitude])
            .addTo(map);
          m.on('dragend', () => {
            const p = m.getLngLat();
            onMarkerDrag(p.lat, p.lng);
          });
          mvRef.current.marker = m;
        }

        map.on('click', (e: any) => {
          const { lat, lng } = e.lngLat;
          locCbRef.current(lat, lng);
          markerMoveTo(lat, lng);
          doReverseGeo(lat, lng).then((addr) => {
            if (addr) { setSearchQuery(addr); addrCbRef.current?.(addr); }
          });
        });

        setLoading(false);
        return;
      } catch (e) {
        if (cancelled) return;
        console.warn('MapVina init failed, falling back to Leaflet', e);
      }

      // Leaflet fallback
      if (!mapContainerRef.current) return;
      mapContainerRef.current.innerHTML = '';

      try {
        const L = await import('leaflet');
        if (cancelled || !mapContainerRef.current) return;

        (L.Icon.Default.prototype as any)._getIconUrl = undefined;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        const center: [number, number] = latitude && longitude
          ? [latitude, longitude]
          : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

        const map = L.map(mapContainerRef.current, {
          center,
          zoom: latitude && longitude ? 15 : 12,
          zoomControl: true,
          attributionControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        leafletRef.current = { map, marker: null, L };

        if (latitude && longitude) {
          const m = L.marker(center, { draggable: true }).addTo(map);
          m.on('dragend', () => {
            const p = m.getLatLng();
            onMarkerDrag(p.lat, p.lng);
          });
          leafletRef.current.marker = m;
        }

        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          locCbRef.current(lat, lng);
          markerMoveTo(lat, lng);
          doReverseGeo(lat, lng).then((addr) => {
            if (addr) { setSearchQuery(addr); addrCbRef.current?.(addr); }
          });
        });

        setTimeout(() => map.invalidateSize(), 200);
        setEngine('leaflet');
        setLoading(false);
      } catch (e) {
        console.error('Leaflet fallback also failed', e);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      mvRef.current?.map.remove();
      leafletRef.current?.map.remove();
    };
  }, []);

  const handleSelect = useCallback((lat: number, lng: number, address: string) => {
    locCbRef.current(lat, lng);
    addrCbRef.current?.(address);
    setSearchQuery(address);
    goToLocation(lat, lng);
  }, []);

  const handleMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        locCbRef.current(lat, lng);
        goToLocation(lat, lng);
        doReverseGeo(lat, lng).then((addr) => {
          if (addr) { setSearchQuery(addr); addrCbRef.current?.(addr); }
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <MapVinaAutocomplete
          value={searchQuery}
          onChange={setSearchQuery}
          onSelect={handleSelect}
          placeholder="Tìm địa chỉ..."
        />
        <Button type="button" variant="outline" size="sm" onClick={handleMyLocation}>
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={mapContainerRef}
        className="rounded-lg border overflow-hidden"
        style={{ height, zIndex: 1 }}
      />

      {loading && (
        <p className="text-sm text-muted-foreground">Đang tải bản đồ...</p>
      )}

      {!loading && !engine && (
        <p className="text-sm text-destructive">Không thể tải bản đồ.</p>
      )}

      {engine === 'leaflet' && (
        <p className="text-xs text-muted-foreground">
          Bản đồ được cung cấp bởi OpenStreetMap
        </p>
      )}
    </div>
  );
}
