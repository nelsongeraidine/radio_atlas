import { NextResponse } from "next/server";
import { getCountries } from "@/lib/radio-api/client";

export const runtime = "nodejs";

// The country list changes rarely (unlike per-city lookups, which the /api/radio/seed route
// caches for only 2 minutes to self-heal from partial failures), so a longer TTL is safe here:
// this is a single upstream call, with no partial-failure risk to recover from.
const CACHE_TTL_MS = 30 * 60 * 1000;

let cache: { data: Awaited<ReturnType<typeof getCountries>>; at: number } | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  try {
    const countries = await getCountries();
    cache = { data: countries, at: now };
    return NextResponse.json(countries);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch countries", detail: String(err) }, { status: 502 });
  }
}
