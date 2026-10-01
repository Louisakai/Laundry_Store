import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '@/constants/config';

export const LOCATION_TASK_NAME = 'laundry-background-location';
export const ACCESS_TOKEN_KEY = 'laundry.accessToken';

async function postLocation(lat: number, lng: number) {
  let accessToken: string | null = null;
  try {
    accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return;
  }
  if (!accessToken) return;

  try {
    await axios.patch(
      `${API_URL}/staff/location`,
      { lat, lng },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  } catch {
    // ignore: will retry on next interval
  }
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const last = locations?.[locations.length - 1];
  if (!last) return;
  await postLocation(last.coords.latitude, last.coords.longitude);
});

export async function startLocationTracking() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') return false;
  }

  // Push an accurate fix immediately so the position reflects the phone now,
  // not the store default from the previous /staff/location/store call.
  try {
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    await postLocation(coords.latitude, coords.longitude);
  } catch {
    // ignore: fall back to the periodic tracker below
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30_000,
    distanceInterval: 10,
    deferredUpdatesInterval: 60_000,
    deferredUpdatesDistance: 100,
    activityType: Location.ActivityType.OtherNavigation,
    foregroundService: {
      notificationTitle: 'Nimble',
      notificationBody: 'Đang cập nhật vị trí giao hàng',
      notificationColor: '#0a7b7b',
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
  return true;
}

export async function stopLocationTracking() {
  try {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch {
    // ignore
  }
}