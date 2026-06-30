import type { Branch } from "@/data/branches";
import { getBranchCoords } from "@/lib/branch-location";

export type UserLocation = {
  latitude: number;
  longitude: number;
};

export type BranchWithDistance = Branch & {
  distanceKm?: number;
};

const earthRadiusKm = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(from: UserLocation, to: UserLocation) {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);

  const startLatitude = toRadians(from.latitude);
  const endLatitude = toRadians(to.latitude);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function branchesSortedByDistance(branches: Branch[], userLocation: UserLocation): BranchWithDistance[] {
  const withDistance: BranchWithDistance[] = [];
  const withoutCoords: BranchWithDistance[] = [];

  for (const branch of branches) {
    const coords = getBranchCoords(branch);
    if (!coords) {
      withoutCoords.push({ ...branch });
      continue;
    }

    withDistance.push({
      ...branch,
      distanceKm: calculateDistanceKm(userLocation, coords),
    });
  }

  withDistance.sort((first, second) => (first.distanceKm ?? 0) - (second.distanceKm ?? 0));
  return [...withDistance, ...withoutCoords];
}

export function formatDistance(distanceKm: number, language: "en" | "ar") {
  const formatted = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
  return language === "ar"
    ? formatted.replace("km", "كم").replace("m", "متر")
    : formatted;
}

/** Estimates driving time from straight-line km using Cairo-style road factors and speeds. */
export function estimateDriveTimeMinutes(straightLineKm: number): number {
  if (straightLineKm < 0.05) return 0;

  const roadKm = straightLineKm * 1.3;

  let avgSpeedKmh: number;
  if (roadKm < 1) avgSpeedKmh = 22;
  else if (roadKm < 5) avgSpeedKmh = 30;
  else if (roadKm < 20) avgSpeedKmh = 35;
  else avgSpeedKmh = 45;

  return Math.max(1, Math.round((roadKm / avgSpeedKmh) * 60));
}

export function formatDriveTime(distanceKm: number, language: "en" | "ar") {
  if (distanceKm < 0.05) {
    return language === "ar" ? "أنت بالقرب من الفرع" : "You are near this branch";
  }

  const minutes = estimateDriveTimeMinutes(distanceKm);

  if (minutes <= 1) {
    return language === "ar" ? "حوالي دقيقة واحدة بالسيارة" : "~1 min by car";
  }

  return language === "ar" ? `حوالي ${minutes} دقيقة بالسيارة` : `~${minutes} min by car`;
}
