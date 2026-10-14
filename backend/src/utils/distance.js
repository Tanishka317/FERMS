/**
 * Calculate distance between two coordinates in kilometers using Haversine formula.
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance.toFixed(1);
}

/**
 * Estimate travel time in minutes based on distance and average urban emergency vehicle speed (40 km/h).
 */
export function estimateEta(distanceKm) {
  if (!distanceKm) return '10 min';
  const minutes = Math.max(2, Math.round((parseFloat(distanceKm) / 40) * 60));
  return `${minutes} min`;
}
