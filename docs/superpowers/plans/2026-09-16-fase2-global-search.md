# Fase 2: Busca Global (Command Palette) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `Ctrl+K`/`⌘K` global search command palette that finds radios (live, by
name), curated cities, and Radio Browser countries, letting the user jump straight to playing a
station, a city's station list, or a whole country's station list.

**Architecture:** Two new server-side (Node-only) Radio Browser client functions and two new
thin API routes for live radio search and the country list; the existing stations route gains
an optional `city` param for country-wide browsing. Two new TanStack Query hooks wrap the new
routes. A new `GlobalSearch` client component owns the palette's own state (query, keyboard
navigation) and filters the already-cached cities/countries lists client-side, merging them with
the live (debounced) radio search results for display. `app/page.tsx` wires the header trigger,
the `Ctrl+K` shortcut, and a `Selection` union (city vs. whole country) that both the map click
and the palette write to.

**Tech Stack:** Next.js 16 (Turbopack) App Router, TypeScript, Tailwind CSS, TanStack Query,
Vitest + Testing Library, pnpm, lucide-react (already a dependency, used by `RadioPlayer`).

**Spec:** `docs/superpowers/specs/2026-09-16-fase2-global-search-design.md`

## Global Constraints

- Radio Browser API is only ever called from server-side routes (`export const runtime = "nodejs"`), never directly from a client component.
- No dado fictício: every station/city/country shown comes from a real API response or the curated `data/cities.json`; missing fields are omitted, never invented.
- `TECHNICAL_TEXT_CLASS` (from `lib/format.ts`) is the single reused UI text-style constant; never redefine an equivalent class string in a component.
- TDD: write the failing test before the implementation, for every task, no exceptions.
- Cidade: busca só contra as cidades curadas de `data/cities.json` (via `useCityMarkers()`), nunca uma cidade arbitrária do mundo.
- País: busca contra a lista completa de países da Radio Browser (`getCountries()`); selecionar um país busca as estações mais populares do país inteiro via `getStationsByCountry(countryCode)` (sem filtro de cidade/estado).
- Escopo desta fase: apenas as categorias RADIOS / CITY / COUNTRY. Busca por gênero/idioma e busca por cidades não curadas ficam explicitamente fora (fases futuras).
- Test command: `pnpm test` (Vitest). Lint: `pnpm lint`. Typecheck: `pnpm exec tsc --noEmit`.

---

### Task 1: Radio Browser client — search by name and country-wide station lookup

**Files:**
- Modify: `lib/radio-api/client.ts`
- Test: `lib/radio-api/client.test.ts`

**Interfaces:**
- Consumes: `fetchFromMirrors<T>(path: string): Promise<T>` and `normalizeStation(raw: RawStation): Station` (both already exist in this file, unchanged).
- Produces:
  - `searchStationsByName(query: string): Promise<Station[]>` — live station-name search, capped at 8 results (palette preview size).
  - `getStationsByCountry(countryCode: string): Promise<Station[]>` — country-wide station list, capped at 60 results (same cap as `getStationsByCountryState`, so a later click into the full list never shows more than what the count already implied).

- [ ] **Step 1: Write the failing tests**

Add to `lib/radio-api/client.test.ts`, inside the existing `describe("client", ...)` block, right after the `"getStationsByCountryState normalizes raw stations"` test:

```ts
  it("searchStationsByName normalizes raw stations and caps at 8 results", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          stationuuid: "xyz-1",
          name: "Jazz FM",
          url: "http://stream.example/jazz",
          url_resolved: "http://stream.example/jazz-resolved",
          country: "France",
          countrycode: "FR",
          state: "",
          language: "french",
          tags: "jazz",
          bitrate: 128,
          codec: "MP3",
          favicon: "",
          votes: 5,
          lastcheckok: 1,
        },
      ],
    });
    const { searchStationsByName } = await import("./client");
    const stations = await searchStationsByName("jazz");
    expect(stations).toEqual([
      {
        id: "xyz-1",
        name: "Jazz FM",
        url: "http://stream.example/jazz-resolved",
        fallbackUrl: "http://stream.example/jazz",
        country: "France",
        countryCode: "FR",
        state: undefined,
        language: "french",
        tags: ["jazz"],
        bitrate: 128,
        codec: "MP3",
        favicon: undefined,
        votes: 5,
      },
    ]);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("name=jazz");
    expect(url).toContain("limit=8");
  });

  it("getStationsByCountry queries by countrycode only, with no state filter", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          stationuuid: "abc-9",
          name: "National Radio",
          url: "http://stream.example/national",
          url_resolved: "http://stream.example/national",
          country: "Japan",
          countrycode: "JP",
          state: "",
          language: "japanese",
          tags: "",
          bitrate: 96,
          codec: "AAC",
          favicon: "",
          votes: 10,
          lastcheckok: 1,
        },
      ],
    });
    const { getStationsByCountry } = await import("./client");
    const stations = await getStationsByCountry("JP");
    expect(stations).toHaveLength(1);
    expect(stations[0].countryCode).toBe("JP");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("countrycode=JP");
    expect(url).not.toContain("state=");
    expect(url).toContain("limit=60");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- client.test.ts`
Expected: FAIL — `searchStationsByName` and `getStationsByCountry` are not exported from `./client`.

- [ ] **Step 3: Implement**

In `lib/radio-api/client.ts`, add these two functions right after `getStationsByCountryState`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- client.test.ts`
Expected: PASS (all tests in the file, including the two new ones).

- [ ] **Step 5: Commit**

```bash
git add lib/radio-api/client.ts lib/radio-api/client.test.ts
git commit -m "feat: add searchStationsByName and getStationsByCountry to radio client"
```

---

### Task 2: `/api/radio/stations` — make `city` optional for country-wide browsing

**Files:**
- Modify: `app/api/radio/stations/route.ts`
- Test: `app/api/radio/stations/route.test.ts`

**Interfaces:**
- Consumes: `getStationsByCountryState(countryCode, city)` (existing) and `getStationsByCountry(countryCode)` (Task 1).
- Produces: `GET /api/radio/stations?countryCode=X[&city=Y]` — `city` now optional. 400 only when `countryCode` is missing.

- [ ] **Step 1: Write the failing tests**

Replace the whole contents of `app/api/radio/stations/route.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getStationsByCountryState = vi.fn();
const getStationsByCountry = vi.fn();

vi.mock("@/lib/radio-api/client", () => ({ getStationsByCountryState, getStationsByCountry }));

describe("GET /api/radio/stations", () => {
  beforeEach(() => {
    vi.resetModules();
    getStationsByCountryState.mockReset();
    getStationsByCountry.mockReset();
  });

  it("returns 400 when countryCode is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/radio/stations?city=Paris"));
    expect(res.status).toBe(400);
  });

  it("returns stations for a valid countryCode and city", async () => {
    getStationsByCountryState.mockResolvedValue([{ id: "1", name: "Radio Test" }]);
    const { GET } = await import("./route");
    const res = await GET(
      new NextRequest("http://localhost/api/radio/stations?countryCode=FR&city=Paris")
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([{ id: "1", name: "Radio Test" }]);
    expect(getStationsByCountryState).toHaveBeenCalledWith("FR", "Paris");
    expect(getStationsByCountry).not.toHaveBeenCalled();
  });

  it("returns country-wide stations when city is omitted", async () => {
    getStationsByCountry.mockResolvedValue([{ id: "2", name: "National Radio" }]);
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/radio/stations?countryCode=JP"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([{ id: "2", name: "National Radio" }]);
    expect(getStationsByCountry).toHaveBeenCalledWith("JP");
    expect(getStationsByCountryState).not.toHaveBeenCalled();
  });

  it("returns 502 when the upstream client throws", async () => {
    getStationsByCountryState.mockRejectedValue(new Error("all mirrors failed"));
    const { GET } = await import("./route");
    const res = await GET(
      new NextRequest("http://localhost/api/radio/stations?countryCode=FR&city=Paris")
    );
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- stations/route.test.ts`
Expected: FAIL — the "countryCode is missing" case currently 400s correctly, but "returns country-wide stations when city is omitted" fails because the route still 400s without `city` and `getStationsByCountry` is never imported/called.

- [ ] **Step 3: Implement**

Replace `app/api/radio/stations/route.ts` entirely with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getStationsByCountry, getStationsByCountryState } from "@/lib/radio-api/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get("countryCode");
  const city = searchParams.get("city");

  if (!countryCode) {
    return NextResponse.json({ error: "countryCode query param is required" }, { status: 400 });
  }

  try {
    const stations = city
      ? await getStationsByCountryState(countryCode, city)
      : await getStationsByCountry(countryCode);
    return NextResponse.json(stations);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch stations", detail: String(err) }, { status: 502 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- stations/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/radio/stations/route.ts app/api/radio/stations/route.test.ts
git commit -m "feat: make city optional on /api/radio/stations for country-wide browsing"
```

---

### Task 3: `/api/radio/countries` — new cached route

**Files:**
- Create: `app/api/radio/countries/route.ts`
- Test: `app/api/radio/countries/route.test.ts`

**Interfaces:**
- Consumes: `getCountries(): Promise<Country[]>` (already exists in `lib/radio-api/client.ts`, unchanged).
- Produces: `GET /api/radio/countries` → `Country[]` (200), or `{ error: string, detail: string }` (502). Cached in-memory for 30 minutes.

- [ ] **Step 1: Write the failing tests**

Create `app/api/radio/countries/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCountries = vi.fn();

vi.mock("@/lib/radio-api/client", () => ({ getCountries }));

describe("GET /api/radio/countries", () => {
  beforeEach(() => {
    vi.resetModules();
    getCountries.mockReset();
  });

  it("returns the country list on success", async () => {
    getCountries.mockResolvedValue([{ name: "France", countryCode: "FR", stationCount: 120 }]);
    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([{ name: "France", countryCode: "FR", stationCount: 120 }]);
  });

  it("returns 502 when the upstream client throws", async () => {
    getCountries.mockRejectedValue(new Error("all mirrors failed"));
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(502);
  });

  it("returns cached data on a second call within the TTL window", async () => {
    getCountries.mockResolvedValue([{ name: "France", countryCode: "FR", stationCount: 120 }]);
    const { GET } = await import("./route");
    await GET();
    await GET();
    expect(getCountries).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- countries/route.test.ts`
Expected: FAIL — `app/api/radio/countries/route.ts` does not exist yet (module not found).

- [ ] **Step 3: Implement**

Create `app/api/radio/countries/route.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- countries/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/radio/countries/route.ts app/api/radio/countries/route.test.ts
git commit -m "feat: add cached /api/radio/countries route"
```

---

### Task 4: `/api/radio/search` — new live radio-name search route

**Files:**
- Create: `app/api/radio/search/route.ts`
- Test: `app/api/radio/search/route.test.ts`

**Interfaces:**
- Consumes: `searchStationsByName(query: string): Promise<Station[]>` (Task 1).
- Produces: `GET /api/radio/search?q=` → `Station[]` (200), `{ error: string }` (400 when `q` missing/blank) or `{ error: string, detail: string }` (502).

- [ ] **Step 1: Write the failing tests**

Create `app/api/radio/search/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const searchStationsByName = vi.fn();

vi.mock("@/lib/radio-api/client", () => ({ searchStationsByName }));

describe("GET /api/radio/search", () => {
  beforeEach(() => {
    vi.resetModules();
    searchStationsByName.mockReset();
  });

  it("returns 400 when q is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/radio/search"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when q is blank", async () => {
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/radio/search?q=%20%20"));
    expect(res.status).toBe(400);
  });

  it("returns matching stations for a valid query", async () => {
    searchStationsByName.mockResolvedValue([{ id: "1", name: "Jazz FM" }]);
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/radio/search?q=jazz"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([{ id: "1", name: "Jazz FM" }]);
    expect(searchStationsByName).toHaveBeenCalledWith("jazz");
  });

  it("returns 502 when the upstream client throws", async () => {
    searchStationsByName.mockRejectedValue(new Error("all mirrors failed"));
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/radio/search?q=jazz"));
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- search/route.test.ts`
Expected: FAIL — `app/api/radio/search/route.ts` does not exist yet.

- [ ] **Step 3: Implement**

Create `app/api/radio/search/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { searchStationsByName } from "@/lib/radio-api/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "q query param is required" }, { status: 400 });
  }

  try {
    const stations = await searchStationsByName(q);
    return NextResponse.json(stations);
  } catch (err) {
    return NextResponse.json({ error: "Failed to search stations", detail: String(err) }, { status: 502 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- search/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/radio/search/route.ts app/api/radio/search/route.test.ts
git commit -m "feat: add /api/radio/search live station-name search route"
```

---

### Task 5: `useStations` city-optional + `StationList` country-wide browsing

**Files:**
- Modify: `lib/radio-api/hooks.ts`
- Modify: `components/StationList.tsx`
- Test: `components/StationList.test.tsx`

**Interfaces:**
- Consumes: `GET /api/radio/stations?countryCode=X[&city=Y]` (Task 2).
- Produces: `useStations(countryCode: string | null, city?: string | null)` — `city` now optional; `StationList`'s `city` prop becomes optional too, and the component now renders (fetching country-wide stations) whenever `countryCode` alone is set.

- [ ] **Step 1: Write the failing tests**

In `components/StationList.test.tsx`, replace the `"renders nothing when no city is selected"` test with these two, and add the third one after the existing `"shows an error state..."` test:

```ts
  it("renders nothing when no country is selected", () => {
    const { container } = renderWithClient(
      <StationList countryCode={null} city={null} nowPlayingId={null} onSelectStation={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("fetches country-wide stations when city is omitted", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "9", name: "National Radio", country: "Japan", countryCode: "JP", tags: [], votes: 1 },
      ],
    });
    renderWithClient(<StationList countryCode="JP" nowPlayingId={null} onSelectStation={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("National Radio")).toBeInTheDocument());
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("countryCode=JP");
    expect(url).not.toContain("city=");
  });
```

(The file already imports `waitFor` from `@testing-library/react` — no import change needed.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- StationList.test.tsx`
Expected: FAIL — `StationList` still requires `city` to render at all (early `if (!countryCode || !city) return null` blocks the country-wide case), and the TS prop type for `city` is not yet optional.

- [ ] **Step 3: Implement**

In `lib/radio-api/hooks.ts`, replace `useStations` with:

```ts
export function useStations(countryCode: string | null, city?: string | null) {
  return useQuery({
    queryKey: ["radio", "stations", countryCode, city ?? null],
    queryFn: async (): Promise<Station[]> => {
      const params = new URLSearchParams({ countryCode: countryCode as string });
      if (city) {
        params.set("city", city);
      }
      const res = await fetch(`/api/radio/stations?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load stations");
      }
      return res.json();
    },
    enabled: Boolean(countryCode),
    staleTime: 10 * 60 * 1000,
  });
}
```

In `components/StationList.tsx`, change the props interface and the early return:

```tsx
interface StationListProps {
  countryCode: string | null;
  city?: string | null;
  nowPlayingId: string | null;
  onSelectStation: (station: Station) => void;
}

export function StationList({ countryCode, city, nowPlayingId, onSelectStation }: StationListProps) {
  const { data, isLoading, isError } = useStations(countryCode, city);

  if (!countryCode) {
    return null;
  }
```

(The rest of `StationList.tsx` — skeleton/error/empty/data rendering — is unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- StationList.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/radio-api/hooks.ts components/StationList.tsx components/StationList.test.tsx
git commit -m "feat: support country-wide station browsing without a city"
```

---

### Task 6: `useCountries` and `useStationSearch` hooks

**Files:**
- Modify: `lib/radio-api/hooks.ts`
- Create: `lib/radio-api/hooks.test.tsx`

**Interfaces:**
- Consumes: `GET /api/radio/countries` (Task 3), `GET /api/radio/search?q=` (Task 4).
- Produces:
  - `useCountries()` — TanStack Query hook returning `Country[]`, `staleTime` 30 minutes.
  - `useStationSearch(query: string)` — TanStack Query hook returning `Station[]`, only enabled when `query.trim().length > 0`.

- [ ] **Step 1: Write the failing tests**

Create `lib/radio-api/hooks.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const fetchMock = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("hooks", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("useCountries fetches and returns the country list", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ name: "France", countryCode: "FR", stationCount: 120 }],
    });
    const { useCountries } = await import("./hooks");
    const { result } = renderHook(() => useCountries(), { wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual([{ name: "France", countryCode: "FR", stationCount: 120 }])
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/radio/countries");
  });

  it("useStationSearch does not fetch when the query is empty", () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    return (async () => {
      const { useStationSearch } = await import("./hooks");
      const { result } = renderHook(() => useStationSearch(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(fetchMock).not.toHaveBeenCalled();
    })();
  });

  it("useStationSearch fetches matching stations for a non-empty query", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "1", name: "Jazz FM", country: "France", countryCode: "FR", tags: [], votes: 1 },
      ],
    });
    const { useStationSearch } = await import("./hooks");
    const { result } = renderHook(() => useStationSearch("jazz"), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("q=jazz");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- hooks.test.tsx`
Expected: FAIL — `useCountries` and `useStationSearch` are not exported from `./hooks`.

- [ ] **Step 3: Implement**

In `lib/radio-api/hooks.ts`, change the type import at the top to include `Country`:

```ts
import type { CityMarker, Country, Station } from "./types";
```

Then add these two hooks at the end of the file:

```ts
export function useCountries() {
  return useQuery({
    queryKey: ["radio", "countries"],
    queryFn: async (): Promise<Country[]> => {
      const res = await fetch("/api/radio/countries");
      if (!res.ok) {
        throw new Error("Failed to load countries");
      }
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useStationSearch(query: string) {
  return useQuery({
    queryKey: ["radio", "search", query],
    queryFn: async (): Promise<Station[]> => {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(`/api/radio/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to search stations");
      }
      return res.json();
    },
    enabled: query.trim().length > 0,
    staleTime: 60 * 1000,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- hooks.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/radio-api/hooks.ts lib/radio-api/hooks.test.tsx
git commit -m "feat: add useCountries and useStationSearch hooks"
```

---

### Task 7: `GlobalSearch` component

**Files:**
- Create: `components/GlobalSearch.tsx`
- Test: `components/GlobalSearch.test.tsx`

**Interfaces:**
- Consumes: `useCityMarkers()` (existing), `useCountries()` and `useStationSearch(query)` (Task 6), `TECHNICAL_TEXT_CLASS` and `formatCityCountry` (existing, `lib/format.ts`), `CityMarker`/`Country`/`Station` types (existing).
- Produces:
  ```ts
  interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectStation: (station: Station) => void;
    onSelectCity: (city: CityMarker) => void;
    onSelectCountry: (country: Country) => void;
  }
  export function GlobalSearch(props: GlobalSearchProps): JSX.Element | null;
  ```
  Renders `null` when `isOpen` is `false`. When open: a centered modal with a text input
  (`data-testid="global-search-input"`, placeholder `"Find a frequency…"`), and — only once the
  query is non-blank — up to three grouped result sections (RADIOS / CITY / COUNTRY), each only
  rendered when it has at least one result. `Escape` calls `onClose`. `ArrowUp`/`ArrowDown` move
  a highlighted index across the combined result list; `Enter` selects the highlighted item.
  Clicking a result selects it directly. Every selection also calls `onClose`.

- [ ] **Step 1: Write the failing tests**

Create `components/GlobalSearch.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalSearch } from "./GlobalSearch";

const fetchMock = vi.fn();

const CITIES = [
  { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
  { city: "Tokyo", countryCode: "JP", countryName: "Japan", lat: 35.6762, lon: 139.6503, stationCount: 8 },
];
const COUNTRIES = [
  { name: "France", countryCode: "FR", stationCount: 120 },
  { name: "Japan", countryCode: "JP", stationCount: 80 },
];

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function mockFetchImpl(searchImpl?: (q: string) => unknown[]) {
  return async (url: string) => {
    if (url.includes("/api/radio/seed")) return { ok: true, json: async () => CITIES };
    if (url.includes("/api/radio/countries")) return { ok: true, json: async () => COUNTRIES };
    if (url.includes("/api/radio/search")) {
      const q = new URL(url, "http://localhost").searchParams.get("q") ?? "";
      return { ok: true, json: async () => (searchImpl ? searchImpl(q) : []) };
    }
    return { ok: true, json: async () => [] };
  };
}

const JAZZ_STATION = { id: "1", name: "Paris Jazz", country: "France", countryCode: "FR", tags: ["jazz"], votes: 3 };

describe("GlobalSearch", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      mockFetchImpl((q) => (q.toLowerCase().includes("jazz") ? [JAZZ_STATION] : []))
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders nothing when closed", () => {
    const { container } = renderWithClient(
      <GlobalSearch isOpen={false} onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the input and no results when opened with an empty query", () => {
    renderWithClient(
      <GlobalSearch isOpen onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    expect(screen.getByTestId("global-search-input")).toBeInTheDocument();
    expect(screen.queryByTestId("global-search-result-city")).not.toBeInTheDocument();
  });

  it("filters cities and countries synchronously as the user types", async () => {
    renderWithClient(
      <GlobalSearch isOpen onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/radio/seed"));
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Par" } });
    await waitFor(() => expect(screen.getAllByTestId("global-search-result-city")).toHaveLength(1));
    expect(screen.getByText("Paris.")).toBeInTheDocument();
    expect(screen.queryByText("Tokyo.")).not.toBeInTheDocument();
  });

  it("shows a skeleton while the radio search is in flight, then the result", async () => {
    let resolveSearch!: (value: unknown) => void;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/radio/seed")) return { ok: true, json: async () => CITIES };
      if (url.includes("/api/radio/countries")) return { ok: true, json: async () => COUNTRIES };
      if (url.includes("/api/radio/search")) {
        return new Promise((resolve) => {
          resolveSearch = resolve;
        });
      }
      return { ok: true, json: async () => [] };
    });
    renderWithClient(
      <GlobalSearch isOpen onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "jazz" } });
    await waitFor(() => expect(screen.getByTestId("global-search-radios-skeleton")).toBeInTheDocument());
    resolveSearch({ ok: true, json: async () => [JAZZ_STATION] });
    await waitFor(() => expect(screen.getByTestId("global-search-result-station")).toBeInTheDocument());
  });

  it("calls onSelectStation and onClose when a radio result is clicked", async () => {
    const onSelectStation = vi.fn();
    const onClose = vi.fn();
    renderWithClient(
      <GlobalSearch isOpen onClose={onClose} onSelectStation={onSelectStation} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "jazz" } });
    await waitFor(() => expect(screen.getByTestId("global-search-result-station")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("global-search-result-station"));
    expect(onSelectStation).toHaveBeenCalledWith(expect.objectContaining({ id: "1", name: "Paris Jazz" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSelectCountry when a country result is clicked", async () => {
    const onSelectCountry = vi.fn();
    renderWithClient(
      <GlobalSearch isOpen onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={onSelectCountry} />
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/radio/countries"));
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Japan" } });
    await waitFor(() => expect(screen.getByTestId("global-search-result-country")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("global-search-result-country"));
    expect(onSelectCountry).toHaveBeenCalledWith(expect.objectContaining({ countryCode: "JP" }));
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderWithClient(
      <GlobalSearch isOpen onClose={onClose} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    fireEvent.keyDown(screen.getByTestId("global-search-input"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("selects the highlighted result with Enter", async () => {
    const onSelectCity = vi.fn();
    renderWithClient(
      <GlobalSearch isOpen onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={onSelectCity} onSelectCountry={vi.fn()} />
    );
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Tokyo" } });
    await waitFor(() => expect(screen.getByTestId("global-search-result-city")).toBeInTheDocument());
    // "Tokyo" matches no station and no country, so the single city result is already at
    // index 0 -- Enter alone selects it without needing ArrowDown first.
    fireEvent.keyDown(screen.getByTestId("global-search-input"), { key: "Enter" });
    expect(onSelectCity).toHaveBeenCalledWith(expect.objectContaining({ city: "Tokyo" }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- GlobalSearch.test.tsx`
Expected: FAIL — `components/GlobalSearch.tsx` does not exist yet.

- [ ] **Step 3: Implement**

Create `components/GlobalSearch.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { useCityMarkers, useCountries, useStationSearch } from "@/lib/radio-api/hooks";
import { TECHNICAL_TEXT_CLASS, formatCityCountry } from "@/lib/format";
import type { CityMarker, Country, Station } from "@/lib/radio-api/types";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation: (station: Station) => void;
  onSelectCity: (city: CityMarker) => void;
  onSelectCountry: (country: Country) => void;
}

type ResultItem =
  | { kind: "station"; station: Station }
  | { kind: "city"; city: CityMarker }
  | { kind: "country"; country: Country };

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function GlobalSearch({
  isOpen,
  onClose,
  onSelectStation,
  onSelectCity,
  onSelectCountry,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: cities } = useCityMarkers();
  const { data: countries } = useCountries();
  const {
    data: stations,
    isLoading: isStationsLoading,
    isError: isStationsError,
  } = useStationSearch(debouncedQuery);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const normalizedQuery = query.trim().toLowerCase();

  const cityResults = useMemo(() => {
    if (!normalizedQuery || !cities) return [];
    return cities.filter(
      (c) => c.city.toLowerCase().includes(normalizedQuery) || c.countryName.toLowerCase().includes(normalizedQuery)
    );
  }, [cities, normalizedQuery]);

  const countryResults = useMemo(() => {
    if (!normalizedQuery || !countries) return [];
    return countries.filter((c) => c.name.toLowerCase().includes(normalizedQuery));
  }, [countries, normalizedQuery]);

  const stationResults = normalizedQuery && stations ? stations : [];

  const results: ResultItem[] = useMemo(
    () => [
      ...stationResults.map((station): ResultItem => ({ kind: "station", station })),
      ...cityResults.map((city): ResultItem => ({ kind: "city", city })),
      ...countryResults.map((country): ResultItem => ({ kind: "country", country })),
    ],
    [stationResults, cityResults, countryResults]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  function selectItem(item: ResultItem) {
    if (item.kind === "station") onSelectStation(item.station);
    else if (item.kind === "city") onSelectCity(item.city);
    else onSelectCountry(item.country);
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = results[activeIndex];
      if (item) selectItem(item);
    }
  }

  if (!isOpen) {
    return null;
  }

  const cityOffset = stationResults.length;
  const countryOffset = stationResults.length + cityResults.length;

  return (
    <div
      data-testid="global-search-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-32 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl rounded-lg border border-white/10 bg-black shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <Search className="h-4 w-4 text-white/40" />
          <input
            ref={inputRef}
            data-testid="global-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find a frequency…"
            className="w-full bg-transparent text-lg text-white placeholder-white/40 outline-none"
          />
        </div>
        {normalizedQuery ? (
          <div className="max-h-96 overflow-y-auto">
            {stationResults.length > 0 ? (
              <div>
                <div className={`px-6 pt-3 ${TECHNICAL_TEXT_CLASS}`}>Radios</div>
                {stationResults.map((station, i) => (
                  <button
                    key={station.id}
                    type="button"
                    data-testid="global-search-result-station"
                    aria-selected={i === activeIndex}
                    onClick={() => selectItem({ kind: "station", station })}
                    className={`flex w-full items-center justify-between px-6 py-2 text-left ${
                      i === activeIndex ? "bg-white/10" : ""
                    }`}
                  >
                    <span className="text-white">{station.name}</span>
                    <span className={TECHNICAL_TEXT_CLASS}>
                      {station.countryCode}
                      {station.tags[0] ? ` · ${station.tags[0]}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {isStationsLoading ? (
              <div data-testid="global-search-radios-skeleton" className="px-6 py-2">
                <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
              </div>
            ) : null}
            {isStationsError ? (
              <div className={`px-6 py-2 ${TECHNICAL_TEXT_CLASS}`}>Signal lost. Try again.</div>
            ) : null}
            {cityResults.length > 0 ? (
              <div>
                <div className={`px-6 pt-3 ${TECHNICAL_TEXT_CLASS}`}>City</div>
                {cityResults.map((city, i) => (
                  <button
                    key={`${city.countryCode}-${city.city}`}
                    type="button"
                    data-testid="global-search-result-city"
                    aria-selected={cityOffset + i === activeIndex}
                    onClick={() => selectItem({ kind: "city", city })}
                    className={`flex w-full items-center justify-between px-6 py-2 text-left ${
                      cityOffset + i === activeIndex ? "bg-white/10" : ""
                    }`}
                  >
                    <span className="text-white">{city.city}.</span>
                    <span className={TECHNICAL_TEXT_CLASS}>{formatCityCountry(city.city, city.countryName)}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {countryResults.length > 0 ? (
              <div>
                <div className={`px-6 pt-3 ${TECHNICAL_TEXT_CLASS}`}>Country</div>
                {countryResults.map((country, i) => (
                  <button
                    key={country.countryCode}
                    type="button"
                    data-testid="global-search-result-country"
                    aria-selected={countryOffset + i === activeIndex}
                    onClick={() => selectItem({ kind: "country", country })}
                    className={`flex w-full items-center justify-between px-6 py-2 text-left ${
                      countryOffset + i === activeIndex ? "bg-white/10" : ""
                    }`}
                  >
                    <span className="text-white">{country.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- GlobalSearch.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/GlobalSearch.tsx components/GlobalSearch.test.tsx
git commit -m "feat: add GlobalSearch command palette component"
```

---

### Task 8: Wire `GlobalSearch` into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`
- Test: `app/page.test.tsx`

**Interfaces:**
- Consumes: `GlobalSearch` (Task 7), `Country`/`CityMarker`/`Station` types (existing).
- Produces: header search trigger (`data-testid="open-search"`), global `Ctrl+K`/`⌘K` shortcut
  that opens the palette, and a `Selection` union (`{ type: "city"; city: CityMarker } | { type: "country"; countryCode: string; countryName: string }`) that both the map click and a
  palette selection write to, replacing the old `selectedCity` state.

- [ ] **Step 1: Write the failing tests**

In `app/page.test.tsx`, change the import line to add `fireEvent` and `waitFor`:

```ts
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
```

Replace the `beforeEach` block's `fetchMock.mockResolvedValue(...)` call with a URL-routed
implementation (keep the `HTMLMediaElement` stubbing below it unchanged):

```ts
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/radio/seed")) {
        return {
          ok: true,
          json: async () => [
            { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
          ],
        };
      }
      if (url.includes("/api/radio/countries")) {
        return { ok: true, json: async () => [{ name: "Japan", countryCode: "JP", stationCount: 80 }] };
      }
      return { ok: true, json: async () => [] };
    });
```

Add these three tests at the end of the `describe("ExplorePage", ...)` block:

```ts
  it("opens the search palette when the header search button is clicked", async () => {
    const { default: ExplorePage } = await import("./page");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ExplorePage />
      </QueryClientProvider>
    );
    expect(screen.queryByTestId("global-search-overlay")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("open-search"));
    expect(screen.getByTestId("global-search-overlay")).toBeInTheDocument();
  });

  it("opens the search palette with the Ctrl+K shortcut", async () => {
    const { default: ExplorePage } = await import("./page");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ExplorePage />
      </QueryClientProvider>
    );
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByTestId("global-search-overlay")).toBeInTheDocument();
  });

  it("selecting a country in search shows its name and a country-wide station list", async () => {
    const { default: ExplorePage } = await import("./page");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ExplorePage />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByTestId("open-search"));
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Japan" } });
    await waitFor(() => expect(screen.getByTestId("global-search-result-country")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("global-search-result-country"));
    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.queryByTestId("global-search-overlay")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- page.test.tsx`
Expected: FAIL — there is no `open-search` button, no `Ctrl+K` listener, and no `GlobalSearch`
rendered yet.

- [ ] **Step 3: Implement**

Replace `app/page.tsx` entirely with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { WorldMap } from "@/components/WorldMap";
import { CityOverlay } from "@/components/CityOverlay";
import { StationList } from "@/components/StationList";
import { RadioPlayer } from "@/components/RadioPlayer";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useCityMarkers } from "@/lib/radio-api/hooks";
import { TECHNICAL_TEXT_CLASS } from "@/lib/format";
import type { CityMarker, Country, Station } from "@/lib/radio-api/types";

type Selection =
  | { type: "city"; city: CityMarker }
  | { type: "country"; countryCode: string; countryName: string };

export default function ExplorePage() {
  const { data: cities, isLoading, isError } = useCityMarkers();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [nowPlaying, setNowPlaying] = useState<Station | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSelectCountry(country: Country) {
    setSelection({ type: "country", countryCode: country.countryCode, countryName: country.name });
  }

  return (
    <main className="flex h-screen flex-col bg-black">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <span className="text-sm uppercase tracking-widest text-white">Radio Atlas</span>
        <button
          type="button"
          data-testid="open-search"
          onClick={() => setIsSearchOpen(true)}
          className={`flex items-center gap-2 rounded border border-white/10 px-3 py-1.5 ${TECHNICAL_TEXT_CLASS}`}
        >
          <Search className="h-3.5 w-3.5" />
          Search
          <span className="text-white/30">⌘K</span>
        </button>
      </header>
      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1">
          <WorldMap cities={cities ?? []} onSelectCity={(city) => setSelection({ type: "city", city })} />
        </div>
        {isLoading ? (
          <div
            data-testid="city-markers-loading"
            className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded bg-black/70 px-3 py-1 ${TECHNICAL_TEXT_CLASS}`}
          >
            Resolving stations…
          </div>
        ) : null}
        {isError ? (
          <div
            data-testid="city-markers-error"
            className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded bg-black/70 px-3 py-1 ${TECHNICAL_TEXT_CLASS}`}
          >
            Signal lost. Try again.
          </div>
        ) : null}
        {selection ? (
          <aside className="w-80 overflow-y-auto border-l border-white/10">
            {selection.type === "city" ? (
              <CityOverlay city={selection.city} />
            ) : (
              <div className="flex flex-col gap-1 p-6">
                <h2 className="text-4xl text-white">{selection.countryName}</h2>
              </div>
            )}
            <StationList
              countryCode={selection.type === "city" ? selection.city.countryCode : selection.countryCode}
              city={selection.type === "city" ? selection.city.city : undefined}
              nowPlayingId={nowPlaying?.id ?? null}
              onSelectStation={setNowPlaying}
            />
          </aside>
        ) : null}
      </div>
      <RadioPlayer station={nowPlaying} />
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStation={setNowPlaying}
        onSelectCity={(city) => setSelection({ type: "city", city })}
        onSelectCountry={handleSelectCountry}
      />
    </main>
  );
}
```

Note: the `Ctrl+K`/`⌘K` listener lives at the page level because it must work even while the
palette is closed (unmounted content). `Escape`/`ArrowUp`/`ArrowDown`/`Enter` only matter while
the palette is open, so they're handled entirely inside `GlobalSearch` itself (Task 7) — no
duplicate listener needed at the page level for those.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- page.test.tsx`
Expected: PASS.

Then run the full suite to confirm nothing else broke:

Run: `pnpm test`
Expected: all test files pass.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/page.test.tsx
git commit -m "feat: wire GlobalSearch into the Explore page (header trigger + Ctrl+K)"
```

---

## Definition of Done

- [ ] `pnpm test` — all tests pass (existing 47 + new tests from this plan).
- [ ] `pnpm lint` — clean.
- [ ] `pnpm exec tsc --noEmit` — clean.
- [ ] Manual check in a real browser: `Ctrl+K` opens the palette from anywhere; typing a curated
      city name shows it under CITY and selecting it opens the same panel as clicking its map
      marker; typing a country name shows it under COUNTRY and selecting it opens a country-wide
      station list; typing a real station name (e.g. a genre or well-known station) shows live
      results under RADIOS after a short delay and selecting one starts playback immediately;
      `Esc` closes the palette.

Note: closing the palette by clicking outside it (outside the modal panel) is out of scope for
this plan — only `Esc`, selecting a result, or the header button/shortcut toggle the palette.
If that gap is noticed in manual testing, it's expected; raise it as a follow-up, not a bug in
this plan's tasks.
