import { useEffect } from 'react';
import { startLocationTracking, stopLocationTracking } from '@/lib/location-task';

export function useLocationTracker(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    startLocationTracking().then(() => {
      if (cancelled) {
        stopLocationTracking();
      }
    });
    return () => {
      cancelled = true;
      stopLocationTracking();
    };
  }, [enabled]);
}
