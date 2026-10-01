import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  Map as MapLibreMapView,
  Camera,
  Marker,
  GeoJSONSource,
  Layer,
} from '@maplibre/maplibre-react-native';
import { Text } from '@/components/ui/text';
import { MAPVINA_STYLE } from '@/constants/config';
import type { LatLng } from '@/types';

export interface MapMarker {
  id: string;
  coordinate: LatLng;
  color?: string;
  label?: string;
}

interface MapViewProps {
  center?: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  routePath?: LatLng[];
  onPress?: (coordinate: LatLng) => void;
  fitBounds?: { coords: LatLng[]; padding?: number };
}

export function MapView({
  center,
  zoom = 13,
  markers = [],
  routePath,
  onPress,
  fitBounds,
}: MapViewProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 15000);
    return () => clearTimeout(t);
  }, []);

  const handlePress = (e: { nativeEvent: { lngLat: [number, number] } }) => {
    const [lng, lat] = e.nativeEvent.lngLat ?? [];
    if (onPress && typeof lat === 'number' && typeof lng === 'number') {
      onPress({ lat, lng });
    }
  };

  const fitBoundsCoords = fitBounds?.coords ?? [];

  return (
    <View className="relative flex-1">
      <MapLibreMapView
        style={{ flex: 1 }}
        mapStyle={MAPVINA_STYLE}
        onPress={handlePress}
        onDidFinishLoadingMap={() => setLoaded(true)}
        attribution={false}>
        {fitBoundsCoords.length > 1 ? (
          <Camera
            bounds={[
              Math.min(...fitBoundsCoords.map((c) => c.lng)),
              Math.min(...fitBoundsCoords.map((c) => c.lat)),
              Math.max(...fitBoundsCoords.map((c) => c.lng)),
              Math.max(...fitBoundsCoords.map((c) => c.lat)),
            ]}
            padding={{
              top: fitBounds?.padding ?? 48,
              right: fitBounds?.padding ?? 48,
              bottom: fitBounds?.padding ?? 48,
              left: fitBounds?.padding ?? 48,
            }}
            duration={0}
          />
        ) : (
          <Camera
            center={center ? [center.lng, center.lat] : undefined}
            zoom={center ? zoom : undefined}
            duration={0}
          />
        )}

        {markers.map((m) => (
          <Marker key={m.id} id={m.id} lngLat={[m.coordinate.lng, m.coordinate.lat]} anchor="center">
            <MarkerDot color={m.color} />
          </Marker>
        ))}

        {routePath && routePath.length > 1 && (
          <GeoJSONSource
            id="route"
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: routePath.map((p) => [p.lng, p.lat] as [number, number]),
              },
            }}>
            <Layer
              id="route-line"
              type="line"
              source="route"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#0a7b7b', 'line-width': 4 }}
            />
          </GeoJSONSource>
        )}
      </MapLibreMapView>

      {!loaded && (
        <View className="absolute inset-0 items-center justify-center bg-surface-muted">
          <ActivityIndicator color="#0a7b7b" />
        </View>
      )}

      <View pointerEvents="none" className="absolute bottom-1 right-2">
        <Text className="text-[10px] text-ink-muted">© MapVina</Text>
      </View>
    </View>
  );
}

function MarkerDot({ color = '#0a7b7b' }: { color?: string }) {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: color,
        borderWidth: 3,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 3,
      }}
    />
  );
}
