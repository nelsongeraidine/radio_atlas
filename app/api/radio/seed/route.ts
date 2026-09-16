import { NextResponse } from "next/server";
import { getStateStationCount } from "@/lib/radio-api/client";
import type { CityEntry, CityMarker } from "@/lib/radio-api/types";
import cities from "@/data/cities.json";

export const runtime = "nodejs";

const CACHE_TTL_MS = 30 * 60 * 1000;
let cache: { data: CityMarker[]; at: number } | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  const entries = cities as CityEntry[];
  const results = await Promise.all(
    entries.map(async (entry) => {
      try {
        const stationCount = await getStateStationCount(entry.countryCode, entry.city);
        return { ...entry, stationCount } satisfies CityMarker;
      } catch {
        return { ...entry, stationCount: 0 } satisfies CityMarker;
      }
    })
  );

  const markers = results.filter((marker) => marker.stationCount > 0);
  cache = { data: markers, at: now };
  return NextResponse.json(markers);
}
