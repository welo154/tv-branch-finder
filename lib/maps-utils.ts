export function buildMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}&z=17&hl=en`;
}

export function parseCoordsFromMapsUrl(mapsUrl: string): { latitude: number; longitude: number } | null {
  const patterns = [
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /3d(-?\d+(?:\.\d+)?).*?4d(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = mapsUrl.match(pattern);
    if (!match) continue;

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
}
