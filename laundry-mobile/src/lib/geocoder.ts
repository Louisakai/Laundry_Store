import { MAPVINA_API_KEY } from '@/constants/config';

const MAPVINA_BASE = 'https://maps.mapvina.com';

interface MapVinaResult {
  place_id: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
}

async function mapvina(path: string, params: Record<string, string>) {
  if (!MAPVINA_API_KEY) return null;
  const url = new URL(`${MAPVINA_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('key', MAPVINA_API_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  return res.json();
}

export async function autocomplete(input: string, size = 5) {
  if (!MAPVINA_API_KEY) return [];
  const data = await mapvina('/api/v2/place/autocomplete/json', { input, size: String(size) });
  return (data?.predictions || []) as { place_id: string; description: string }[];
}

export async function placeDetail(placeId: string) {
  const data = await mapvina('/api/v2/place/details/json', { place_id: placeId });
  return (data?.result as MapVinaResult | undefined) ?? null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (MAPVINA_API_KEY) {
    const data = await mapvina('/api/v2/geocode/json', {
      latlng: `${lat},${lng}`,
      size: '1',
    });
    const result = (data?.results || [])[0] as MapVinaResult | undefined;
    if (result?.formatted_address) return result.formatted_address;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=vi`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'laundry-mobile/1.0' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json as { display_name?: string }).display_name ?? null;
  } catch {
    return null;
  }
}

export async function searchAddress(query: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query,
    )}&format=jsonv2&limit=5&addressdetails=1&accept-language=vi`;
    const res = await fetch(url, { headers: { 'User-Agent': 'laundry-mobile/1.0' } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      lat: string;
      lon: string;
      display_name: string;
    }[];
    return json.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      address: r.display_name,
    }));
  } catch {
    return [];
  }
}
