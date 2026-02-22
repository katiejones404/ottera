type ZipCoords = {
  lat: number;
  lng: number;
};

const memoryCache = new Map<string, ZipCoords | null>();

const normalizeZip = (zip: string) => zip.trim().slice(0, 5);

const loadPersistentCache = () => {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("ottera_zip_coords_cache_v1");
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, ZipCoords | null>;
    for (const [zip, coords] of Object.entries(parsed)) {
      memoryCache.set(zip, coords);
    }
  } catch {
    // ignore cache read errors
  }
};

const savePersistentCache = () => {
  if (typeof window === "undefined") return;
  try {
    const asObject: Record<string, ZipCoords | null> = {};
    for (const [zip, coords] of memoryCache.entries()) {
      asObject[zip] = coords;
    }
    localStorage.setItem("ottera_zip_coords_cache_v1", JSON.stringify(asObject));
  } catch {
    // ignore cache write errors
  }
};

export async function getZipCoords(zip: string): Promise<ZipCoords | null> {
  const normalized = normalizeZip(zip);
  if (!/^\d{5}$/.test(normalized)) return null;

  if (memoryCache.size === 0) {
    loadPersistentCache();
  }

  if (memoryCache.has(normalized)) {
    return memoryCache.get(normalized) ?? null;
  }

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${normalized}`);
    if (!response.ok) {
      memoryCache.set(normalized, null);
      savePersistentCache();
      return null;
    }

    const json = (await response.json()) as {
      places?: Array<{ latitude: string; longitude: string }>;
    };

    const place = json.places?.[0];
    if (!place) {
      memoryCache.set(normalized, null);
      savePersistentCache();
      return null;
    }

    const coords = {
      lat: Number(place.latitude),
      lng: Number(place.longitude),
    };

    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
      memoryCache.set(normalized, null);
      savePersistentCache();
      return null;
    }

    memoryCache.set(normalized, coords);
    savePersistentCache();
    return coords;
  } catch {
    return null;
  }
}

export async function getNearestDistanceMilesForZip(
  userZip: string,
  candidateZips: string[]
): Promise<number | null> {
  const user = await getZipCoords(userZip);
  if (!user) return null;

  const normalizedCandidates = [...new Set(candidateZips.map(normalizeZip).filter((zip) => /^\d{5}$/.test(zip)))];
  if (normalizedCandidates.length === 0) return null;

  const points = await Promise.all(normalizedCandidates.map((zip) => getZipCoords(zip)));

  let nearest = Number.POSITIVE_INFINITY;
  for (const point of points) {
    if (!point) continue;
    const miles = haversineMiles(user.lat, user.lng, point.lat, point.lng);
    if (miles < nearest) nearest = miles;
  }

  if (!Number.isFinite(nearest)) return null;
  return nearest;
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}
