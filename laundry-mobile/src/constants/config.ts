export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const MAPVINA_API_KEY = process.env.EXPO_PUBLIC_MAPVINA_API_KEY || '';

export const MAPVINA_STYLE = MAPVINA_API_KEY
  ? `https://maps.mapvina.com/styles/v2/streets.json?key=${MAPVINA_API_KEY}`
  : 'https://tiles.openfreemap.org/styles/liberty';

export const DEFAULT_CENTER = { lat: 10.03, lng: 105.77 };
