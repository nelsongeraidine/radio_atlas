import { promises as dns } from "node:dns";

export interface Mirror {
  host: string;
}

const SRV_RECORD = "_api._tcp.radio-browser.info";
const FALLBACK_MIRRORS: Mirror[] = [
  { host: "de1.api.radio-browser.info" },
  { host: "de2.api.radio-browser.info" },
  { host: "at1.api.radio-browser.info" },
  { host: "nl1.api.radio-browser.info" },
];
const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedMirrors: Mirror[] | null = null;
let cachedAt = 0;
let inFlight: Promise<Mirror[]> | null = null;
// Bumped on every invalidateMirrorCache() call. A resolution that was already in flight at
// invalidation time is allowed to finish (callers awaiting it still get an answer), but it is
// tagged with the epoch at the time it started and must not write into the cache once that
// epoch is stale — otherwise it would silently repopulate the cache you just tried to clear.
// The invalidated inFlight reference is also dropped so the very next caller starts a fresh
// resolution instead of piggybacking on the old (now cache-inert) one.
let epoch = 0;

async function resolveMirrors(): Promise<Mirror[]> {
  try {
    const records = await dns.resolveSrv(SRV_RECORD);
    if (records.length === 0) {
      throw new Error("empty SRV result");
    }
    const sorted = [...records].sort((a, b) => a.priority - b.priority || b.weight - a.weight);
    return sorted.map((record) => ({ host: record.name }));
  } catch {
    return FALLBACK_MIRRORS;
  }
}

export async function getMirrors(): Promise<Mirror[]> {
  const now = Date.now();
  if (cachedMirrors && now - cachedAt < CACHE_TTL_MS) {
    return cachedMirrors;
  }
  if (!inFlight) {
    const requestEpoch = epoch;
    inFlight = resolveMirrors().then((mirrors) => {
      if (requestEpoch === epoch) {
        cachedMirrors = mirrors;
        cachedAt = Date.now();
      }
      inFlight = null;
      return mirrors;
    });
  }
  return inFlight;
}

export function invalidateMirrorCache(): void {
  cachedMirrors = null;
  cachedAt = 0;
  inFlight = null;
  epoch += 1;
}
