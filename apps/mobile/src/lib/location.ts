import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

/** Posizione approssimativa dell'utente; se nega il permesso l'app funziona comunque per città. */
export function useApproxLocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setDenied(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })().catch(() => setDenied(true));
  }, []);

  return { coords, denied };
}
