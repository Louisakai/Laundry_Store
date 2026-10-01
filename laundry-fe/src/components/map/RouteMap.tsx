'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { RouteStop, RouteLeg } from '@/types';
import { MAPVINA_STYLE } from '@/lib/mapvina';
import 'leaflet/dist/leaflet.css';
import 'mapvina-gl/dist/mapvina-gl.css';

interface LatLng {
  lat: number;
  lng: number;
}

interface RouteMapProps {
  stops: RouteStop[];
  legs?: RouteLeg[];
  height?: string;
  center?: LatLng;
  shipperPosition?: LatLng | null;
  liveLabel?: string;
}

const MV_KEY = process.env.NEXT_PUBLIC_MAPVINA_API_KEY || '';

export function RouteMap({
  stops,
  legs,
  height = '400px',
  center,
  shipperPosition,
  liveLabel = 'Vị trí của tôi',
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const engineRef = useRef<'mapvina' | 'leaflet' | null>(null);
  const mvglRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const mvSourceId = useRef(0);
  const mvLayersRef = useRef<string[]>([]);
  const shipperMarkerRef = useRef<any>(null);
  const stopMarkersRef = useRef<any[]>([]);
  const legLinesRef = useRef<any[]>([]);
  const routeKeyRef = useRef('');

  const nextSourceId = useCallback(() => `route-${++mvSourceId.current}`, []);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const mv = await import('mapvina-gl');
        if (cancelled || !mapContainerRef.current) return;

        const defaultCenter = center
          ? { lat: center.lat, lng: center.lng }
          : { lat: stops[0]?.address?.latitude ?? 10.03, lng: stops[0]?.address?.longitude ?? 105.77 };

        const map = new mv.Map({
          container: mapContainerRef.current,
          style: `${MAPVINA_STYLE}${MV_KEY}`,
          center: [defaultCenter.lng, defaultCenter.lat],
          zoom: 13,
        });

        map.addControl(new mv.NavigationControl(), 'top-right');

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 15000);
          map.once('load', () => { clearTimeout(timeout); resolve(); });
          map.once('error', () => { clearTimeout(timeout); reject(new Error('error')); });
        });

        if (cancelled) { map.remove(); return; }

        mapRef.current = map;
        mvglRef.current = mv;
        engineRef.current = 'mapvina';
        setMapReady(true);
        setTimeout(() => map.resize(), 200);
        return;
      } catch (e) {
        if (cancelled) return;
        console.warn('MapVina init failed, falling back to Leaflet', e);
      }

      if (!mapContainerRef.current) return;
      try {
        const L = await import('leaflet');
        if (cancelled || !mapContainerRef.current) return;

        const defaultCenter: [number, number] = center
          ? [center.lat, center.lng]
          : [stops[0]?.address?.latitude ?? 10.03, stops[0]?.address?.longitude ?? 105.77];

        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 13,
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a>',
        }).addTo(map);

        mapRef.current = map;
        LRef.current = L;
        engineRef.current = 'leaflet';
        setMapReady(true);
        setTimeout(() => map.invalidateSize(), 200);
      } catch (e2) {
        console.error('Both MapVina and Leaflet failed', e2);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        engineRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const m of stopMarkersRef.current) {
      if (engineRef.current === 'leaflet') map.removeLayer(m);
      else if (m.remove) m.remove();
    }
    stopMarkersRef.current = [];

    if (engineRef.current === 'leaflet') {
      const L = LRef.current;
      if (!L) return;
      for (const stop of stops) {
        const bg = stop.type === 'pickup' ? '#3b82f6' : '#22c55e';
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${stop.order}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([stop.address.latitude, stop.address.longitude], { icon }).addTo(map);
        marker.bindPopup(`<strong>#${stop.order}</strong><br/><b>${stop.type === 'pickup' ? 'Lấy đồ' : 'Giao đồ'}</b><br/>${stop.address.label}<br/><small>${stop.address.addressLine}</small>`);
        stopMarkersRef.current.push(marker);
      }
      return;
    }

    if (engineRef.current === 'mapvina') {
      const mv = mvglRef.current;
      if (!mv) return;

      for (const id of mvLayersRef.current) {
        try { map.removeLayer(id); } catch { /* */ }
      }
      for (const id of mvLayersRef.current) {
        try { map.removeSource(id); } catch { /* */ }
      }
      mvLayersRef.current = [];

      for (const stop of stops) {
        const sid = nextSourceId();
        const bg = stop.type === 'pickup' ? '#3b82f6' : '#22c55e';
        const lngLat: [number, number] = [stop.address.longitude, stop.address.latitude];

        map.addSource(sid, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: lngLat },
            properties: {},
          },
        });

        map.addLayer({
          id: sid,
          type: 'circle',
          source: sid,
          paint: {
            'circle-radius': 14,
            'circle-color': bg,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        });

        const labelId = sid + '-l';
        map.addLayer({
          id: labelId,
          type: 'symbol',
          source: sid,
          layout: {
            'text-field': String(stop.order),
            'text-size': 12,
            'text-allow-overlap': true,
          },
          paint: { 'text-color': '#fff' },
        });

        mvLayersRef.current.push(sid, labelId);
      }
    }
  }, [stops, mapReady]);

  const routeKey = legs?.map(l => `${l.fromIdx}-${l.toIdx}-${l.distance}-${l.source}`).join('|') ?? '';

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!legs || legs.length === 0) return;
    if (routeKey === routeKeyRef.current) return;
    routeKeyRef.current = routeKey;

    for (const l of legLinesRef.current) {
      if (engineRef.current === 'leaflet') map.removeLayer(l);
      else if (l.remove) l.remove();
    }
    legLinesRef.current = [];

    if (engineRef.current === 'leaflet') {
      const L = LRef.current;
      if (!L) return;
      for (const leg of legs) {
        if (leg.path.length < 2) continue;
        const polyline = L.polyline(leg.path.map((p) => [p.lat, p.lng] as [number, number]), { color: '#3b82f6', weight: 4, opacity: 0.8 }).addTo(map);
        legLinesRef.current.push(polyline);
      }

      const allCoords: [number, number][] = stops.map((s) => [s.address.latitude, s.address.longitude]);
      if (shipperPosition) allCoords.push([shipperPosition.lat, shipperPosition.lng]);
      if (allCoords.length > 0) {
        map.fitBounds(L.latLngBounds(allCoords).pad(0.1));
      }
      return;
    }

    if (engineRef.current === 'mapvina') {
      const mv = mvglRef.current;
      if (!mv) return;

      const allCoords: number[][] = [];

      for (const leg of legs) {
        if (leg.path.length < 2) continue;
        const sid = nextSourceId();
        const coords = leg.path.map((p) => [p.lng, p.lat]);
        allCoords.push(...coords);

        const color = '#3b82f6';

        map.addSource(sid, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
          },
        });

        map.addLayer({
          id: sid,
          type: 'line',
          source: sid,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': color, 'line-width': 4, 'line-opacity': 0.85 },
        });

        legLinesRef.current.push({ remove: () => { try { map.removeLayer(sid); map.removeSource(sid); } catch { /* */ } } });
      }

      if (allCoords.length > 0) {
        const bounds = allCoords.reduce(
          (b: number[][], c: number[]) => {
            b[0][0] = Math.min(b[0][0], c[0]);
            b[0][1] = Math.min(b[0][1], c[1]);
            b[1][0] = Math.max(b[1][0], c[0]);
            b[1][1] = Math.max(b[1][1], c[1]);
            return b;
          },
          [[Infinity, Infinity], [-Infinity, -Infinity]],
        );
        map.fitBounds(bounds, { padding: 60 });
      }
    }
  }, [routeKey, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (shipperMarkerRef.current) {
      if (engineRef.current === 'leaflet') map.removeLayer(shipperMarkerRef.current);
      else shipperMarkerRef.current.remove();
      shipperMarkerRef.current = null;
    }

    if (!shipperPosition) return;

    if (engineRef.current === 'leaflet') {
      const L = LRef.current;
      if (!L) return;
      const pulseIcon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.4),0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const marker = L.marker([shipperPosition.lat, shipperPosition.lng], { icon: pulseIcon, zIndexOffset: 1000 }).addTo(map);
      marker.bindPopup(`<b>${liveLabel}</b>`);
      shipperMarkerRef.current = marker;
      return;
    }

    if (engineRef.current === 'mapvina') {
      const mv = mvglRef.current;
      if (!mv) return;
      const el = document.createElement('div');
      el.innerHTML = '<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.4)"></div>';
      const marker = new mv.Marker({ element: el.firstElementChild })
        .setLngLat([shipperPosition.lng, shipperPosition.lat])
        .addTo(map);
      const popup = new mv.Popup({ offset: 25 }).setHTML(`<b>${liveLabel}</b>`);
      marker.setPopup(popup);
      shipperMarkerRef.current = marker;
    }
  }, [shipperPosition, liveLabel, mapReady]);

  return (
    <div
      ref={mapContainerRef}
      className="rounded-lg border overflow-hidden relative"
      style={{ height, zIndex: 1 }}
    />
  );
}
