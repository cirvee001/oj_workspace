export interface LatLng {
  lat: number;
  lng: number;
}

/** Staff must be within this many metres of the branch to clock in by location. */
export const GEO_RADIUS_M = 150;

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const formatDistance = (m: number): string =>
  m > 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m';

export function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
    });
  });
}

/** True when the browser can read QR codes from the camera. */
export const canScanCodes = typeof window !== 'undefined' && 'BarcodeDetector' in window;
