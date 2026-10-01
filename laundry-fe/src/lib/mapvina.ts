const MAPVINA_BASE = 'https://maps.mapvina.com';

let apiKey = '';

export function setMapVinaKey(key: string) {
  apiKey = key;
}

function getKey(): string {
  if (apiKey) return apiKey;
  apiKey = process.env.NEXT_PUBLIC_MAPVINA_API_KEY || '';
  return apiKey;
}

async function fetchMapVina(path: string, params: Record<string, string>) {
  const key = getKey();
  if (!key) throw new Error('MapVina API key not configured');

  const url = new URL(`${MAPVINA_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error_message || `MapVina ${res.status}`);
  }
  return res.json();
}

export interface MapVinaPrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
    main_text_matched_substrings?: { offset: number; length: number }[];
  };
  types: string[];
}

export interface MapVinaPlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
    location_type: string;
    viewport: { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } };
  };
  address_components: { long_name: string; short_name: string; types: string[] }[];
  types: string[];
}

export interface MapVinaReverseResult {
  place_id: string;
  formatted_address: string;
  name: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  types: string[];
}

export interface MapVinaDirectionLeg {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  steps: {
    distance: { text: string; value: number };
    duration: { text: string; value: number };
    html_instructions: string;
    maneuver?: string;
    polyline: { points: string };
  }[];
}

export interface MapVinaDirectionResult {
  status: string;
  routes: {
    legs: MapVinaDirectionLeg[];
    overview_polyline: { points: string };
    bounds: { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } };
  }[];
}

export async function autocomplete(input: string, size = 5): Promise<MapVinaPrediction[]> {
  const data = await fetchMapVina('/api/v2/place/autocomplete/json', {
    input,
    size: String(size),
  });
  return data.predictions || [];
}

export async function placeDetail(placeId: string): Promise<MapVinaPlace | null> {
  const data = await fetchMapVina('/api/v2/place/details/json', {
    place_id: placeId,
  });
  return data.result || null;
}

export async function search(query: string): Promise<MapVinaPlace | null> {
  const data = await fetchMapVina('/api/v2/place/textsearch/json', {
    query,
    size: '1',
  });
  const results = data.results || [];
  return results[0] || null;
}

export async function reverse(lat: number, lng: number): Promise<MapVinaReverseResult | null> {
  const data = await fetchMapVina('/api/v2/geocode/json', {
    latlng: `${lat},${lng}`,
    size: '1',
  });
  const results = data.results || [];
  return results[0] || null;
}

export async function directions(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: 'motorcycling' | 'driving' | 'walking' = 'motorcycling',
): Promise<MapVinaDirectionResult> {
  return fetchMapVina('/route/v2/directions/json', {
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode,
  });
}

export async function searchAndResolve(query: string): Promise<{ lat: number; lng: number; address: string } | null> {
  const predictions = await autocomplete(query, 1);
  if (!predictions.length) return null;
  const detail = await placeDetail(predictions[0].place_id);
  if (!detail) return null;
  return {
    lat: detail.geometry.location.lat,
    lng: detail.geometry.location.lng,
    address: detail.formatted_address,
  };
}

export const MAPVINA_STYLE = `https://maps.mapvina.com/styles/v2/streets.json?key=`;
export const MAPVINA_STYLE_NIGHT = `https://maps.mapvina.com/styles/v2/night.json?key=`;
export const MAPVINA_STYLE_SIMPLE = `https://maps.mapvina.com/styles/v2/simple.json?key=`;
