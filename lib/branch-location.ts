import type { Branch } from "@/data/branches";
import { parseCoordsFromMapsUrl } from "@/lib/maps-utils";

const EGYPT_BOUNDS = {
  minLatitude: 22,
  maxLatitude: 32,
  minLongitude: 24,
  maxLongitude: 37,
};

export function isValidEgyptCoordinate(latitude: number, longitude: number): boolean {
  return (
    latitude >= EGYPT_BOUNDS.minLatitude &&
    latitude <= EGYPT_BOUNDS.maxLatitude &&
    longitude >= EGYPT_BOUNDS.minLongitude &&
    longitude <= EGYPT_BOUNDS.maxLongitude
  );
}

export function getBranchCoords(branch: Branch): { latitude: number; longitude: number } | null {
  if (branch.latitude !== null && branch.longitude !== null) {
    if (isValidEgyptCoordinate(branch.latitude, branch.longitude)) {
      return { latitude: branch.latitude, longitude: branch.longitude };
    }
  }

  const parsed = parseCoordsFromMapsUrl(branch.mapsUrl);
  if (parsed && isValidEgyptCoordinate(parsed.latitude, parsed.longitude)) {
    return parsed;
  }

  return null;
}
