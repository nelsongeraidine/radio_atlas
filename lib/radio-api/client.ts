import { getMirrors, invalidateMirrorCache } from "./mirrors";
import type { Country, RawCountry, RawStation, Station } from "./types";

const REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "RadioAtlas/1.0" },
    });
    if (!res.ok) {
      throw new Error(`Radio Browser request failed: ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromMirrors<T>(path: string): Promise<T> {
  const mirrors = await getMirrors();
  let lastError: unknown;
  for (const mirror of mirrors) {
    try {
      return await fetchWithTimeout<T>(`https://${mirror.host}${path}`);
    } catch (err) {
      lastError = err;
    }
  }
  invalidateMirrorCache();
  throw new Error(`All Radio Browser mirrors failed: ${String(lastError)}`);
}

export async function getCountries(): Promise<Country[]> {
  const raw = await fetchFromMirrors<RawCountry[]>("/json/countries");
  return raw
    .filter((c) => c.stationcount > 0)
    .map((c) => ({ name: c.name, countryCode: c.iso_3166_1, stationCount: c.stationcount }));
}

export async function getStateStationCount(countryCode: string, stateName: string): Promise<number> {
  const params = new URLSearchParams({
    countrycode: countryCode,
    state: stateName,
    hidebroken: "true",
    limit: "60",
  });
  const raw = await fetchFromMirrors<RawStation[]>(`/json/stations/search?${params.toString()}`);
  return raw.length;
}

export async function getStationsByCountryState(countryCode: string, stateName: string): Promise<Station[]> {
  const params = new URLSearchParams({
    countrycode: countryCode,
    state: stateName,
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    limit: "60",
  });
  const raw = await fetchFromMirrors<RawStation[]>(`/json/stations/search?${params.toString()}`);
  return raw.map(normalizeStation);
}

export async function searchStationsByName(query: string): Promise<Station[]> {
  const params = new URLSearchParams({
    name: query,
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    limit: "8",
  });
  const raw = await fetchFromMirrors<RawStation[]>(`/json/stations/search?${params.toString()}`);
  return raw.map(normalizeStation);
}

export async function getStationsByCountry(countryCode: string): Promise<Station[]> {
  const params = new URLSearchParams({
    countrycode: countryCode,
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    limit: "60",
  });
  const raw = await fetchFromMirrors<RawStation[]>(`/json/stations/search?${params.toString()}`);
  return raw.map(normalizeStation);
}


function normalizeStation(raw: RawStation): Station {
  return {
    id: raw.stationuuid,
    name: raw.name,
    url: raw.url_resolved || raw.url,
    fallbackUrl: raw.url_resolved && raw.url_resolved !== raw.url ? raw.url : undefined,
    country: raw.country,
    countryCode: raw.countrycode,
    state: raw.state || undefined,
    language: raw.language || undefined,
    tags: raw.tags ? raw.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    bitrate: raw.bitrate > 0 ? raw.bitrate : undefined,
    codec: raw.codec || undefined,
    favicon: raw.favicon || undefined,
    votes: raw.votes,
  };
}
