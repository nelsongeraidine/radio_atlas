import { NextResponse } from "next/server";
import { getStateStationCount } from "@/lib/radio-api/client";
import type { CityEntry, CityMarker } from "@/lib/radio-api/types";
import cities from "@/data/cities.json";

export const runtime = "nodejs";

// A short TTL (rather than the API's usual 30min) so that a snapshot degraded by transient
// per-city failures self-heals quickly instead of staying wrong for half an hour.
const CACHE_TTL_MS = 2 * 60 * 1000;
// Bound how many cities are looked up simultaneously instead of firing all ~60 requests at
// once against a single Radio Browser mirror.
const CONCURRENCY = 8;

let cache: { data: CityMarker[]; at: number } | null = null;

interface CityOutcome {
  entry: CityEntry;
  stationCount: number;
  failed: boolean;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  const entries = cities as CityEntry[];
  const outcomes = await mapWithConcurrency<CityEntry, CityOutcome>(entries, CONCURRENCY, async (entry) => {
    try {
      const stationCount = await getStateStationCount(entry.countryCode, entry.city);
      return { entry, stationCount, failed: false };
    } catch {
      return { entry, stationCount: 0, failed: true };
    }
  });

  // A full Radio Browser outage (every single lookup failing) must be distinguishable from a
  // real "no cities have stations" result, so useCityMarkers()'s isError can actually fire
  // instead of silently rendering zero markers.
  const allFailed = outcomes.length > 0 && outcomes.every((outcome) => outcome.failed);
  if (allFailed) {
    return NextResponse.json({ error: "Radio Browser unavailable" }, { status: 502 });
  }

  // Failed per-city lookups are excluded outright (not coerced into a "0 stations" marker) so a
  // transient failure never looks identical to a genuinely empty city; combined with the short
  // TTL above, a bad snapshot is retried on the next request within minutes.
  const markers = outcomes
    .filter((outcome) => !outcome.failed && outcome.stationCount > 0)
    .map((outcome) => ({ ...outcome.entry, stationCount: outcome.stationCount }) satisfies CityMarker);

  cache = { data: markers, at: now };
  return NextResponse.json(markers);
}
