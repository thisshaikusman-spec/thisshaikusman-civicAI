export const KNOWN_LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  sulur: { lat: 11.0238, lng: 77.1258 },
  gandhipuram: { lat: 11.0183, lng: 76.9644 },
  'rs puram': { lat: 11.0093, lng: 76.9513 },
  peelamedu: { lat: 11.0267, lng: 77.0028 },
  singanallur: { lat: 10.9982, lng: 77.0255 },
  chinnampalayam: { lat: 10.9575, lng: 77.0862 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  'anna salai': { lat: 13.0604, lng: 80.2496 },
  't nagar': { lat: 13.0418, lng: 80.2341 },
  velachery: { lat: 12.9815, lng: 80.218 },
  kattur: { lat: 10.7905, lng: 78.7047 },
  trichy: { lat: 10.7905, lng: 78.7047 },
  tiruchirappalli: { lat: 10.7905, lng: 78.7047 },
  madurai: { lat: 9.9252, lng: 78.1198 },
  salem: { lat: 11.6643, lng: 78.146 },
  tiruppur: { lat: 11.1085, lng: 77.3411 },
  erode: { lat: 11.341, lng: 77.7172 },
  vellore: { lat: 12.9165, lng: 79.1325 },
  kadayanallur: { lat: 9.0833, lng: 77.35 },
  tenkasi: { lat: 8.9602, lng: 77.3149 },
  thirunelveli: { lat: 8.7139, lng: 77.7567 },
  tirunelveli: { lat: 8.7139, lng: 77.7567 },
}

export function geocodeAddress(locationStr: string | null | undefined): { lat: number | null; lng: number | null } {
  if (!locationStr) return { lat: null, lng: null }
  const locLower = locationStr.toLowerCase().trim()
  for (const [key, coords] of Object.entries(KNOWN_LOCATION_COORDINATES)) {
    if (locLower.includes(key)) {
      return coords
    }
  }
  return { lat: null, lng: null }
}

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  try {
    const R = 6371.0
    const dlat = ((lat2 - lat1) * Math.PI) / 180
    const dlon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dlat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dlon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  } catch {
    return 0
  }
}
