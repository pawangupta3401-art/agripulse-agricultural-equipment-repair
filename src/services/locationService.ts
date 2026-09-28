/**
 * Location Service — P2K Step 1 AgriPulse
 *
 * Provides farmer geolocation via browser Geolocation API.
 * Handles permission denial gracefully — app never crashes.
 * Falls back to a sensible default rural India coordinate.
 *
 * SECURITY: Precise location is NEVER stored in localStorage.
 * Location is held only in component React state for the current session.
 *
 * Hindi messages are used for all farmer-facing communication.
 */

export type LocationSource = "gps" | "manual" | "default";

export interface FarmerLocation {
  latitude: number;
  longitude: number;
  locationSource: LocationSource;
  locationUpdatedAt: string;
  /** GPS accuracy in metres (only present when source = "gps") */
  accuracy?: number;
}

export type LocationPermissionStatus =
  | "unknown"
  | "granted"
  | "denied"
  | "unavailable";

export interface LocationResult {
  success: boolean;
  location?: FarmerLocation;
  permissionStatus: LocationPermissionStatus;
  /** Farmer-friendly Hindi message */
  messageHi: string;
}

/**
 * Default centre coordinate — Lucknow, Uttar Pradesh, India.
 * Used when GPS is unavailable or denied.
 * Represents a realistic rural agriculture area.
 */
export const DEFAULT_FARMER_LOCATION: FarmerLocation = {
  latitude: 26.8467,
  longitude: 80.9462,
  locationSource: "default",
  locationUpdatedAt: new Date().toISOString(),
};

/**
 * Request the farmer's real GPS location from the browser.
 *
 * - If permission is denied: returns default location, never throws.
 * - If GPS is unavailable: returns default location, never throws.
 * - Timeout: 10 seconds (rural networks may be slow).
 */
export async function requestFarmerLocation(): Promise<LocationResult> {
  // Guard: Geolocation not supported
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return {
      success: false,
      location: DEFAULT_FARMER_LOCATION,
      permissionStatus: "unavailable",
      messageHi:
        "आपके डिवाइस में GPS उपलब्ध नहीं है। डिफ़ॉल्ट स्थान दिखाया जा रहा है।",
    };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        success: false,
        location: DEFAULT_FARMER_LOCATION,
        permissionStatus: "unknown",
        messageHi:
          "GPS लोकेशन में समय लग रहा है। डिफ़ॉल्ट स्थान दिखाया जा रहा है।",
      });
    }, 10_000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        resolve({
          success: true,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            locationSource: "gps",
            locationUpdatedAt: new Date().toISOString(),
            accuracy: position.coords.accuracy,
          },
          permissionStatus: "granted",
          messageHi: "आपकी GPS लोकेशन मिल गई।",
        });
      },
      (error) => {
        clearTimeout(timeout);
        let permissionStatus: LocationPermissionStatus = "unknown";
        let messageHi = "लोकेशन उपलब्ध नहीं। डिफ़ॉल्ट स्थान दिखाया जा रहा है।";

        if (error.code === error.PERMISSION_DENIED) {
          permissionStatus = "denied";
          messageHi =
            "लोकेशन अनुमति नहीं दी गई। पास के मैकेनिक बाद में भी देखे जा सकते हैं।";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          permissionStatus = "unavailable";
          messageHi =
            "GPS सिग्नल नहीं मिला। डिफ़ॉल्ट स्थान दिखाया जा रहा है।";
        } else if (error.code === error.TIMEOUT) {
          permissionStatus = "unknown";
          messageHi =
            "GPS समय सीमा समाप्त हो गई। डिफ़ॉल्ट स्थान दिखाया जा रहा है।";
        }

        resolve({
          success: false,
          location: DEFAULT_FARMER_LOCATION,
          permissionStatus,
          messageHi,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 9_000,
        maximumAge: 60_000,
      }
    );
  });
}

/**
 * Returns the default farmer location immediately (no permission request).
 * Use when the farmer has previously declined or app is offline.
 */
export function getDefaultFarmerLocation(): FarmerLocation {
  return { ...DEFAULT_FARMER_LOCATION, locationUpdatedAt: new Date().toISOString() };
}

/**
 * Haversine formula — approximate distance in km between two GPS points.
 * Accurate enough for <= 50km ranges (sub-km precision not needed).
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Human-readable Hindi label for location source.
 */
export function formatLocationSourceHi(source: LocationSource): string {
  switch (source) {
    case "gps":
      return "GPS से मिली लोकेशन";
    case "manual":
      return "आपने दी गई लोकेशन";
    case "default":
    default:
      return "अनुमानित स्थान";
  }
}

/**
 * P2K Step 2: Format approximate distance for farmer display:
 * "लगभग 4.2 km दूर"
 * Strictly does not expose raw latitude/longitude.
 */
export function formatApproxDistance(distanceKm: number): string {
  const rounded = Math.round(distanceKm * 10) / 10;
  return `लगभग ${rounded.toFixed(1)} km दूर`;
}

export interface CalculatedDistanceResult {
  distanceKm: number;
  displayText: string;
  isLive: boolean;
}

/**
 * P2K Step 2: Calculate approximate distance between Farmer and Technician.
 * - If live GPS coordinates available for both, calculates via Haversine.
 * - If live coordinates are missing, safely falls back to technician's baseline distance.
 * - Never invents an exact distance.
 * - Returns user-friendly Hindi display string: "लगभग X.X km दूर"
 */
export function calculateTechnicianDistance(
  tech: { latitude?: number; longitude?: number; distanceKm: number },
  farmerLoc?: FarmerLocation | null
): CalculatedDistanceResult {
  if (
    farmerLoc &&
    typeof farmerLoc.latitude === "number" &&
    typeof farmerLoc.longitude === "number" &&
    typeof tech.latitude === "number" &&
    typeof tech.longitude === "number"
  ) {
    const liveDist = haversineDistanceKm(
      farmerLoc.latitude,
      farmerLoc.longitude,
      tech.latitude,
      tech.longitude
    );
    return {
      distanceKm: liveDist,
      displayText: formatApproxDistance(liveDist),
      isLive: true,
    };
  }

  // Safe fallback based on available location data
  const fallback = typeof tech.distanceKm === "number" ? tech.distanceKm : 3.5;
  return {
    distanceKm: fallback,
    displayText: formatApproxDistance(fallback),
    isLive: false,
  };
}

/**
 * P2K Step 2: Directions / Route URL helper.
 * Generates an OpenStreetMap directions link between farmer location and technician.
 * If directions are unavailable, returns null so caller shows location & distance only.
 */
export function getRouteUrl(
  farmerLoc?: FarmerLocation | null,
  techLoc?: { latitude?: number; longitude?: number } | null
): string | null {
  if (
    farmerLoc &&
    typeof farmerLoc.latitude === "number" &&
    typeof farmerLoc.longitude === "number" &&
    techLoc &&
    typeof techLoc.latitude === "number" &&
    typeof techLoc.longitude === "number"
  ) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${farmerLoc.latitude}%2C${farmerLoc.longitude}%3B${techLoc.latitude}%2C${techLoc.longitude}`;
  }
  return null;
}

/**
 * P2K Step 2: Safe farmer location summary for job card.
 * Does NOT expose unnecessary personal info (no home address or phone).
 */
export function getSafeFarmerLocationText(farmerLoc?: FarmerLocation | null): string {
  if (!farmerLoc) {
    return "लखनऊ ग्रामीण क्षेत्र (अनुमानित स्थान)";
  }
  if (farmerLoc.locationSource === "gps") {
    return "किसान का खेत — GPS लोकेशन उपलब्ध";
  }
  return "लखनऊ ग्रामीण कृषि क्षेत्र";
}

