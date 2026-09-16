# Radio Atlas — Fase 1: Core Explore — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working end-to-end slice: user opens the app, sees a map with real city markers, clicks a city, sees real stations for it, and plays a real live stream.

**Architecture:** Next.js App Router app. All Radio Browser API access is isolated behind `lib/radio-api/` (mirror resolution + typed client) and exposed to the client only through two Next.js Route Handlers (`/api/radio/seed`, `/api/radio/stations`) running on the Node runtime, because DNS SRV resolution is not available in the browser or on the Edge runtime. A small static dataset (`data/cities.json`) supplies city coordinates, since the Radio Browser API has no city-level geo data; every station count and station field shown to the user still comes live from the Radio Browser API.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind CSS, pnpm, MapLibre GL, TanStack Query, Framer Motion, Lucide Icons, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-16-fase1-core-explore-design.md`

## Global Constraints

- Client never calls `radio-browser.info` directly — only via `/api/radio/*` (CLAUDE.md).
- `/api/radio/*` routes run on the Node.js runtime (not Edge) because `dns.resolveSrv` requires it.
- Never show fabricated data: if the API doesn't return a field, omit it in the UI, don't invent a value.
- Station fetches only happen on user action (selecting a city) — never load the full catalog on initial load.
- Audio stream loads only when the user clicks Play (lazy).
- API queries are cached client-side (TanStack Query) and server-side (in-memory TTL cache) to avoid refetching the same city/region.
- Every stream error is handled: timeout, fallback URL, `SIGNAL LOST` + `TRY AGAIN`, never a frozen UI.
- Technical text pattern (uppercase, small): `CITY, COUNTRY` / `N STATIONS` / `BITRATE KBPS` / `LIVE` — implemented once and reused, never redefined per component.
- Discreet skeleton loading on every API search.
- Package manager is pnpm.
- Map is MapLibre GL 2D (ADR in spec) — never render thousands of markers simultaneously (the curated `cities.json` keeps this true structurally).

---

## File Structure

```
package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.mjs
vitest.config.ts, vitest.setup.ts
app/
  layout.tsx
  page.tsx
  globals.css
  providers.tsx
  api/radio/seed/route.ts
  api/radio/seed/route.test.ts
  api/radio/stations/route.ts
  api/radio/stations/route.test.ts
lib/
  format.ts
  format.test.ts
  radio-api/
    types.ts
    mirrors.ts
    mirrors.test.ts
    client.ts
    client.test.ts
    hooks.ts
data/
  cities.json
components/
  WorldMap.tsx
  WorldMap.test.tsx
  CityOverlay.tsx
  CityOverlay.test.tsx
  StationCard.tsx
  StationCard.test.tsx
  StationList.tsx
  StationList.test.tsx
  RadioPlayer.tsx
  RadioPlayer.test.tsx
  AudioVisualizer.tsx
  AudioVisualizer.test.tsx
```

`lib/radio-api/hooks.ts` is a small addition not in the original spec diagram (client-side TanStack Query hooks that call `/api/radio/*`) — needed to keep data-fetching logic out of components, consistent with the "isolate all API access" rule.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `vitest.config.ts`, `vitest.setup.ts`
- Test: `app/layout.test.tsx`

**Interfaces:**
- Produces: a working `pnpm dev` / `pnpm build` / `pnpm test` toolchain that every later task builds on.

- [ ] **Step 1: Scaffold Next.js app**

```bash
pnpm dlx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*" --no-turbopack
```

Answer prompts to install into the current directory (it already has `CLAUDE.md`, `PRD.md`, `docs/` — keep them).

- [ ] **Step 2: Install runtime dependencies**

```bash
pnpm add maplibre-gl @tanstack/react-query framer-motion lucide-react
```

- [ ] **Step 3: Install test dependencies**

```bash
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 5: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Add `test` script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Write a smoke test for the root layout**

`app/layout.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import RootLayout from "./layout";

describe("RootLayout", () => {
  it("renders children", () => {
    render(
      <RootLayout>
        <div>content</div>
      </RootLayout>
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `pnpm test app/layout.test.tsx`
Expected: FAIL (`layout.tsx` doesn't exist yet, or `Providers` import missing)

- [ ] **Step 9: Write `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  height: 100%;
}
```

- [ ] **Step 10: Write `app/providers.tsx`**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 11: Write `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radio Atlas",
  description: "Discover and listen to live radio stations from around the world.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `pnpm test app/layout.test.tsx`
Expected: PASS

- [ ] **Step 13: Run build to verify the toolchain works end-to-end**

Run: `pnpm build`
Expected: builds successfully (there's no `app/page.tsx` yet from the scaffold's default — if `create-next-app` generated one, leave it in place; Task 13 replaces it).

- [ ] **Step 14: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.mjs tailwind.config.ts postcss.config.mjs vitest.config.ts vitest.setup.ts app/
git commit -m "chore: scaffold Next.js app with Tailwind, TanStack Query, and Vitest"
```

---

## Task 2: Radio Browser types and cities dataset

**Files:**
- Create: `lib/radio-api/types.ts`
- Create: `data/cities.json`

**Interfaces:**
- Produces: `RawCountry`, `RawState`, `RawStation`, `Country`, `Station`, `CityMarker` types, and the `cities.json` shape `{ city: string; countryCode: string; countryName: string; lat: number; lon: number }[]`, both consumed by Task 3, 4, 6, 7.

- [ ] **Step 1: Write `lib/radio-api/types.ts`**

```ts
// Raw shapes returned by the Radio Browser API (https://www.radio-browser.info)

export interface RawCountry {
  name: string;
  iso_3166_1: string;
  stationcount: number;
}

export interface RawState {
  name: string;
  country: string;
  stationcount: number;
}

export interface RawStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  tags: string;
  bitrate: number;
  codec: string;
  favicon: string;
  votes: number;
  lastcheckok: number;
}

// Types used across the app

export interface Country {
  name: string;
  countryCode: string;
  stationCount: number;
}

export interface Station {
  id: string;
  name: string;
  url: string;
  fallbackUrl?: string;
  country: string;
  countryCode: string;
  state?: string;
  language?: string;
  tags: string[];
  bitrate?: number;
  codec?: string;
  favicon?: string;
  votes: number;
}

export interface CityMarker {
  city: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lon: number;
  stationCount: number;
}

export interface CityEntry {
  city: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lon: number;
}
```

- [ ] **Step 2: Write `data/cities.json`**

A curated list of major world cities, matched to Radio Browser's `countrycode` (ISO 3166-1 alpha-2). Coordinates are real geographic facts, used only for marker placement — not radio data.

```json
[
  { "city": "Paris", "countryCode": "FR", "countryName": "France", "lat": 48.8566, "lon": 2.3522 },
  { "city": "London", "countryCode": "GB", "countryName": "United Kingdom", "lat": 51.5074, "lon": -0.1278 },
  { "city": "Berlin", "countryCode": "DE", "countryName": "Germany", "lat": 52.52, "lon": 13.405 },
  { "city": "Madrid", "countryCode": "ES", "countryName": "Spain", "lat": 40.4168, "lon": -3.7038 },
  { "city": "Rome", "countryCode": "IT", "countryName": "Italy", "lat": 41.9028, "lon": 12.4964 },
  { "city": "Amsterdam", "countryCode": "NL", "countryName": "Netherlands", "lat": 52.3676, "lon": 4.9041 },
  { "city": "Lisbon", "countryCode": "PT", "countryName": "Portugal", "lat": 38.7223, "lon": -9.1393 },
  { "city": "Vienna", "countryCode": "AT", "countryName": "Austria", "lat": 48.2082, "lon": 16.3738 },
  { "city": "Warsaw", "countryCode": "PL", "countryName": "Poland", "lat": 52.2297, "lon": 21.0122 },
  { "city": "Stockholm", "countryCode": "SE", "countryName": "Sweden", "lat": 59.3293, "lon": 18.0686 },
  { "city": "Oslo", "countryCode": "NO", "countryName": "Norway", "lat": 59.9139, "lon": 10.7522 },
  { "city": "Copenhagen", "countryCode": "DK", "countryName": "Denmark", "lat": 55.6761, "lon": 12.5683 },
  { "city": "Helsinki", "countryCode": "FI", "countryName": "Finland", "lat": 60.1699, "lon": 24.9384 },
  { "city": "Dublin", "countryCode": "IE", "countryName": "Ireland", "lat": 53.3498, "lon": -6.2603 },
  { "city": "Athens", "countryCode": "GR", "countryName": "Greece", "lat": 37.9838, "lon": 23.7275 },
  { "city": "Prague", "countryCode": "CZ", "countryName": "Czechia", "lat": 50.0755, "lon": 14.4378 },
  { "city": "Budapest", "countryCode": "HU", "countryName": "Hungary", "lat": 47.4979, "lon": 19.0402 },
  { "city": "Zurich", "countryCode": "CH", "countryName": "Switzerland", "lat": 47.3769, "lon": 8.5417 },
  { "city": "Brussels", "countryCode": "BE", "countryName": "Belgium", "lat": 50.8503, "lon": 4.3517 },
  { "city": "Istanbul", "countryCode": "TR", "countryName": "Turkey", "lat": 41.0082, "lon": 28.9784 },
  { "city": "Moscow", "countryCode": "RU", "countryName": "Russia", "lat": 55.7558, "lon": 37.6173 },
  { "city": "New York", "countryCode": "US", "countryName": "United States", "lat": 40.7128, "lon": -74.006 },
  { "city": "Los Angeles", "countryCode": "US", "countryName": "United States", "lat": 34.0522, "lon": -118.2437 },
  { "city": "Chicago", "countryCode": "US", "countryName": "United States", "lat": 41.8781, "lon": -87.6298 },
  { "city": "Toronto", "countryCode": "CA", "countryName": "Canada", "lat": 43.6532, "lon": -79.3832 },
  { "city": "Vancouver", "countryCode": "CA", "countryName": "Canada", "lat": 49.2827, "lon": -123.1207 },
  { "city": "Mexico City", "countryCode": "MX", "countryName": "Mexico", "lat": 19.4326, "lon": -99.1332 },
  { "city": "Sao Paulo", "countryCode": "BR", "countryName": "Brazil", "lat": -23.5505, "lon": -46.6333 },
  { "city": "Rio de Janeiro", "countryCode": "BR", "countryName": "Brazil", "lat": -22.9068, "lon": -43.1729 },
  { "city": "Brasilia", "countryCode": "BR", "countryName": "Brazil", "lat": -15.8267, "lon": -47.9218 },
  { "city": "Belo Horizonte", "countryCode": "BR", "countryName": "Brazil", "lat": -19.9167, "lon": -43.9345 },
  { "city": "Porto Alegre", "countryCode": "BR", "countryName": "Brazil", "lat": -30.0346, "lon": -51.2177 },
  { "city": "Recife", "countryCode": "BR", "countryName": "Brazil", "lat": -8.0476, "lon": -34.877 },
  { "city": "Buenos Aires", "countryCode": "AR", "countryName": "Argentina", "lat": -34.6037, "lon": -58.3816 },
  { "city": "Santiago", "countryCode": "CL", "countryName": "Chile", "lat": -33.4489, "lon": -70.6693 },
  { "city": "Bogota", "countryCode": "CO", "countryName": "Colombia", "lat": 4.711, "lon": -74.0721 },
  { "city": "Lima", "countryCode": "PE", "countryName": "Peru", "lat": -12.0464, "lon": -77.0428 },
  { "city": "Tokyo", "countryCode": "JP", "countryName": "Japan", "lat": 35.6762, "lon": 139.6503 },
  { "city": "Osaka", "countryCode": "JP", "countryName": "Japan", "lat": 34.6937, "lon": 135.5023 },
  { "city": "Seoul", "countryCode": "KR", "countryName": "South Korea", "lat": 37.5665, "lon": 126.978 },
  { "city": "Beijing", "countryCode": "CN", "countryName": "China", "lat": 39.9042, "lon": 116.4074 },
  { "city": "Shanghai", "countryCode": "CN", "countryName": "China", "lat": 31.2304, "lon": 121.4737 },
  { "city": "Hong Kong", "countryCode": "HK", "countryName": "Hong Kong", "lat": 22.3193, "lon": 114.1694 },
  { "city": "Bangkok", "countryCode": "TH", "countryName": "Thailand", "lat": 13.7563, "lon": 100.5018 },
  { "city": "Singapore", "countryCode": "SG", "countryName": "Singapore", "lat": 1.3521, "lon": 103.8198 },
  { "city": "Jakarta", "countryCode": "ID", "countryName": "Indonesia", "lat": -6.2088, "lon": 106.8456 },
  { "city": "Manila", "countryCode": "PH", "countryName": "Philippines", "lat": 14.5995, "lon": 120.9842 },
  { "city": "Mumbai", "countryCode": "IN", "countryName": "India", "lat": 19.076, "lon": 72.8777 },
  { "city": "Delhi", "countryCode": "IN", "countryName": "India", "lat": 28.7041, "lon": 77.1025 },
  { "city": "Kuala Lumpur", "countryCode": "MY", "countryName": "Malaysia", "lat": 3.139, "lon": 101.6869 },
  { "city": "Sydney", "countryCode": "AU", "countryName": "Australia", "lat": -33.8688, "lon": 151.2093 },
  { "city": "Melbourne", "countryCode": "AU", "countryName": "Australia", "lat": -37.8136, "lon": 144.9631 },
  { "city": "Auckland", "countryCode": "NZ", "countryName": "New Zealand", "lat": -36.8485, "lon": 174.7633 },
  { "city": "Cairo", "countryCode": "EG", "countryName": "Egypt", "lat": 30.0444, "lon": 31.2357 },
  { "city": "Lagos", "countryCode": "NG", "countryName": "Nigeria", "lat": 6.5244, "lon": 3.3792 },
  { "city": "Nairobi", "countryCode": "KE", "countryName": "Kenya", "lat": -1.2921, "lon": 36.8219 },
  { "city": "Johannesburg", "countryCode": "ZA", "countryName": "South Africa", "lat": -26.2041, "lon": 28.0473 },
  { "city": "Casablanca", "countryCode": "MA", "countryName": "Morocco", "lat": 33.5731, "lon": -7.5898 },
  { "city": "Dubai", "countryCode": "AE", "countryName": "United Arab Emirates", "lat": 25.2048, "lon": 55.2708 },
  { "city": "Tel Aviv", "countryCode": "IL", "countryName": "Israel", "lat": 32.0853, "lon": 34.7818 }
]
```

- [ ] **Step 3: Commit**

```bash
git add lib/radio-api/types.ts data/cities.json
git commit -m "feat: add Radio Browser types and curated cities dataset"
```

---

## Task 2b: Shared technical text formatting (`lib/format.ts`)

CLAUDE.md requires the technical text pattern (uppercase, small, `CITY, COUNTRY` / `N STATIONS` / `BITRATE KBPS`) to be "a single UI constant, reused in hover/card/player, never redefined per component." This task creates that single source of truth; every later component task (8, 10, 11) imports from it instead of inlining its own formatting.

**Files:**
- Create: `lib/format.ts`
- Test: `lib/format.test.ts`

**Interfaces:**
- Produces: `TECHNICAL_TEXT_CLASS: string`, `formatCityCountry(city: string, country: string): string`, `formatStationCount(count: number): string`, `formatBitrate(bitrate: number): string` — consumed by `StationCard`, `StationList`, `RadioPlayer`, `CityOverlay` (Tasks 8, 10, 11).

- [ ] **Step 1: Write the failing test**

`lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatBitrate, formatCityCountry, formatStationCount } from "./format";

describe("format", () => {
  it("formats city and country as 'CITY, COUNTRY' (uppercased via CSS, not string case)", () => {
    expect(formatCityCountry("Paris", "France")).toBe("Paris, France");
  });

  it("formats station count with a pluralized unit", () => {
    expect(formatStationCount(1)).toBe("1 station");
    expect(formatStationCount(12)).toBe("12 stations");
  });

  it("formats bitrate with the KBPS unit", () => {
    expect(formatBitrate(128)).toBe("128 KBPS");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/format.test.ts`
Expected: FAIL with "Cannot find module './format'"

- [ ] **Step 3: Write `lib/format.ts`**

Text case is handled by the shared `TECHNICAL_TEXT_CLASS` (Tailwind's `uppercase`), not by upper-casing the strings themselves — this keeps the underlying data (city/country/genre names) intact for screen readers and for any future non-uppercase usage, while every visual instance still renders uppercase.

```ts
export const TECHNICAL_TEXT_CLASS = "text-xs uppercase tracking-wide text-white/50";

export function formatCityCountry(city: string, country: string): string {
  return `${city}, ${country}`;
}

export function formatStationCount(count: number): string {
  return `${count} station${count === 1 ? "" : "s"}`;
}

export function formatBitrate(bitrate: number): string {
  return `${bitrate} KBPS`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/format.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/format.ts lib/format.test.ts
git commit -m "feat: add shared technical text formatting used by every station/city display"
```

---

## Task 3: Mirror resolution (`lib/radio-api/mirrors.ts`)

**Files:**
- Create: `lib/radio-api/mirrors.ts`
- Test: `lib/radio-api/mirrors.test.ts`

**Interfaces:**
- Produces: `getMirrors(): Promise<Mirror[]>`, `invalidateMirrorCache(): void`, `interface Mirror { host: string }` — consumed by Task 4 (`client.ts`).

- [ ] **Step 1: Write the failing test**

`lib/radio-api/mirrors.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resolveSrv = vi.fn();

vi.mock("node:dns", () => ({
  promises: { resolveSrv: (...args: unknown[]) => resolveSrv(...args) },
}));

describe("mirrors", () => {
  beforeEach(() => {
    resolveSrv.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves mirrors via DNS SRV, sorted by priority then weight", async () => {
    resolveSrv.mockResolvedValue([
      { name: "at1.api.radio-browser.info", priority: 10, weight: 1, port: 443 },
      { name: "de1.api.radio-browser.info", priority: 1, weight: 1, port: 443 },
      { name: "de2.api.radio-browser.info", priority: 1, weight: 5, port: 443 },
    ]);
    const { getMirrors } = await import("./mirrors");
    const mirrors = await getMirrors();
    expect(mirrors.map((m) => m.host)).toEqual([
      "de2.api.radio-browser.info",
      "de1.api.radio-browser.info",
      "at1.api.radio-browser.info",
    ]);
  });

  it("falls back to a fixed mirror list when DNS resolution fails", async () => {
    resolveSrv.mockRejectedValue(new Error("DNS failure"));
    const { getMirrors } = await import("./mirrors");
    const mirrors = await getMirrors();
    expect(mirrors.length).toBeGreaterThan(0);
  });

  it("caches the resolved mirrors and does not re-resolve within the TTL", async () => {
    resolveSrv.mockResolvedValue([{ name: "de1.api.radio-browser.info", priority: 1, weight: 1, port: 443 }]);
    const { getMirrors } = await import("./mirrors");
    await getMirrors();
    await getMirrors();
    expect(resolveSrv).toHaveBeenCalledTimes(1);
  });

  it("re-resolves after invalidateMirrorCache is called", async () => {
    resolveSrv.mockResolvedValue([{ name: "de1.api.radio-browser.info", priority: 1, weight: 1, port: 443 }]);
    const { getMirrors, invalidateMirrorCache } = await import("./mirrors");
    await getMirrors();
    invalidateMirrorCache();
    await getMirrors();
    expect(resolveSrv).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/radio-api/mirrors.test.ts`
Expected: FAIL with "Cannot find module './mirrors'"

- [ ] **Step 3: Write `lib/radio-api/mirrors.ts`**

```ts
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
  const mirrors = await resolveMirrors();
  cachedMirrors = mirrors;
  cachedAt = now;
  return mirrors;
}

export function invalidateMirrorCache(): void {
  cachedMirrors = null;
  cachedAt = 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/radio-api/mirrors.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/radio-api/mirrors.ts lib/radio-api/mirrors.test.ts
git commit -m "feat: resolve Radio Browser mirrors via DNS SRV with fallback and cache"
```

---

## Task 4: Typed Radio Browser client (`lib/radio-api/client.ts`)

**Files:**
- Create: `lib/radio-api/client.ts`
- Test: `lib/radio-api/client.test.ts`

**Interfaces:**
- Consumes: `getMirrors(): Promise<Mirror[]>`, `invalidateMirrorCache(): void` from `./mirrors`; `RawCountry`, `RawState`, `RawStation`, `Country`, `Station` from `./types`.
- Produces: `getCountries(): Promise<Country[]>`, `getStateStationCount(countryCode: string, stateName: string): Promise<number>`, `getStationsByCountryState(countryCode: string, stateName: string): Promise<Station[]>` — consumed by Task 6 and Task 7 (route handlers).

- [ ] **Step 1: Write the failing test**

`lib/radio-api/client.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./mirrors", () => ({
  getMirrors: vi.fn(async () => [{ host: "mirror-a" }, { host: "mirror-b" }]),
  invalidateMirrorCache: vi.fn(),
}));

const fetchMock = vi.fn();

describe("client", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("getCountries filters out countries with zero stations and maps fields", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { name: "France", iso_3166_1: "FR", stationcount: 120 },
        { name: "Nowhere", iso_3166_1: "XX", stationcount: 0 },
      ],
    });
    const { getCountries } = await import("./client");
    const countries = await getCountries();
    expect(countries).toEqual([{ name: "France", countryCode: "FR", stationCount: 120 }]);
  });

  it("getStateStationCount sums exact-name matches only", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { name: "Paris", country: "France", stationcount: 5 },
        { name: "Paris Region", country: "France", stationcount: 2 },
      ],
    });
    const { getStateStationCount } = await import("./client");
    const count = await getStateStationCount("FR", "Paris");
    expect(count).toBe(5);
  });

  it("getStationsByCountryState normalizes raw stations", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          stationuuid: "abc-123",
          name: "Radio Test",
          url: "http://stream.example/original",
          url_resolved: "http://stream.example/resolved",
          country: "France",
          countrycode: "FR",
          state: "Paris",
          language: "french",
          tags: "pop,talk",
          bitrate: 128,
          codec: "MP3",
          favicon: "http://example/favicon.png",
          votes: 42,
          lastcheckok: 1,
        },
      ],
    });
    const { getStationsByCountryState } = await import("./client");
    const stations = await getStationsByCountryState("FR", "Paris");
    expect(stations).toEqual([
      {
        id: "abc-123",
        name: "Radio Test",
        url: "http://stream.example/resolved",
        fallbackUrl: "http://stream.example/original",
        country: "France",
        countryCode: "FR",
        state: "Paris",
        language: "french",
        tags: ["pop", "talk"],
        bitrate: 128,
        codec: "MP3",
        favicon: "http://example/favicon.png",
        votes: 42,
      },
    ]);
  });

  it("falls back to the next mirror when the first one fails", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { getCountries } = await import("./client");
    const countries = await getCountries();
    expect(countries).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws after all mirrors fail", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));
    const { getCountries } = await import("./client");
    await expect(getCountries()).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/radio-api/client.test.ts`
Expected: FAIL with "Cannot find module './client'"

- [ ] **Step 3: Write `lib/radio-api/client.ts`**

```ts
import { getMirrors, invalidateMirrorCache } from "./mirrors";
import type { Country, RawCountry, RawState, RawStation, Station } from "./types";

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
  const raw = await fetchFromMirrors<RawState[]>(
    `/json/states/${encodeURIComponent(countryCode)}/${encodeURIComponent(stateName)}`
  );
  const exact = raw.filter((s) => s.name.toLowerCase() === stateName.toLowerCase());
  const matches = exact.length > 0 ? exact : raw;
  return matches.reduce((sum, s) => sum + s.stationcount, 0);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/radio-api/client.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/radio-api/client.ts lib/radio-api/client.test.ts
git commit -m "feat: add typed Radio Browser client with mirror fallback and normalization"
```

---

## Task 5: Client-side data hooks (`lib/radio-api/hooks.ts`)

**Files:**
- Create: `lib/radio-api/hooks.ts`

**Interfaces:**
- Consumes: `CityMarker`, `Station` from `./types`; calls `/api/radio/seed` and `/api/radio/stations` (Task 6, Task 7).
- Produces: `useCityMarkers()`, `useStations(countryCode: string | null, city: string | null)` — consumed by Task 9 (`app/page.tsx`) and Task 8 (`StationList`).

No dedicated test file for this task: it's a thin TanStack Query wrapper with no branching logic of its own: its behavior is exercised through `StationList.test.tsx` (Task 8) and `WorldMap`/`page` wiring (Task 10), which mock `fetch` directly. Keeping it test-free here avoids duplicating the same assertions twice.

- [ ] **Step 1: Write `lib/radio-api/hooks.ts`**

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { CityMarker, Station } from "./types";

export function useCityMarkers() {
  return useQuery({
    queryKey: ["radio", "seed"],
    queryFn: async (): Promise<CityMarker[]> => {
      const res = await fetch("/api/radio/seed");
      if (!res.ok) {
        throw new Error("Failed to load city markers");
      }
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useStations(countryCode: string | null, city: string | null) {
  return useQuery({
    queryKey: ["radio", "stations", countryCode, city],
    queryFn: async (): Promise<Station[]> => {
      const params = new URLSearchParams({ countryCode: countryCode as string, city: city as string });
      const res = await fetch(`/api/radio/stations?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load stations");
      }
      return res.json();
    },
    enabled: Boolean(countryCode && city),
    staleTime: 10 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/radio-api/hooks.ts
git commit -m "feat: add TanStack Query hooks for city markers and stations"
```

---

## Task 6: `/api/radio/seed` route

**Files:**
- Create: `app/api/radio/seed/route.ts`
- Test: `app/api/radio/seed/route.test.ts`

**Interfaces:**
- Consumes: `getStateStationCount(countryCode, stateName): Promise<number>` from `@/lib/radio-api/client`; `CityEntry`, `CityMarker` from `@/lib/radio-api/types`; data from `@/data/cities.json`.
- Produces: `GET(): Promise<Response>` returning `CityMarker[]` as JSON — consumed by `useCityMarkers()` (Task 5).

- [ ] **Step 1: Write the failing test**

`app/api/radio/seed/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getStateStationCount = vi.fn();

vi.mock("@/lib/radio-api/client", () => ({ getStateStationCount }));
vi.mock("@/data/cities.json", () => ({
  default: [
    { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522 },
    { city: "Nowhere", countryCode: "XX", countryName: "Nowhereland", lat: 0, lon: 0 },
  ],
}));

describe("GET /api/radio/seed", () => {
  beforeEach(() => {
    vi.resetModules();
    getStateStationCount.mockReset();
  });

  it("returns only cities with at least one real station", async () => {
    getStateStationCount.mockImplementation(async (countryCode: string) =>
      countryCode === "FR" ? 12 : 0
    );
    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([
      { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
    ]);
  });

  it("treats a lookup failure for one city as zero stations, without failing the whole request", async () => {
    getStateStationCount.mockImplementation(async (countryCode: string) => {
      if (countryCode === "FR") return 12;
      throw new Error("mirror down");
    });
    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([
      { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test app/api/radio/seed/route.test.ts`
Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 3: Write `app/api/radio/seed/route.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test app/api/radio/seed/route.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/radio/seed/route.ts app/api/radio/seed/route.test.ts
git commit -m "feat: add /api/radio/seed route joining curated cities with real station counts"
```

---

## Task 7: `/api/radio/stations` route

**Files:**
- Create: `app/api/radio/stations/route.ts`
- Test: `app/api/radio/stations/route.test.ts`

**Interfaces:**
- Consumes: `getStationsByCountryState(countryCode, stateName): Promise<Station[]>` from `@/lib/radio-api/client`.
- Produces: `GET(request: NextRequest): Promise<Response>` returning `Station[]` (200) or `{ error: string }` (400/502) — consumed by `useStations()` (Task 5).

- [ ] **Step 1: Write the failing test**

`app/api/radio/stations/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getStationsByCountryState = vi.fn();

vi.mock("@/lib/radio-api/client", () => ({ getStationsByCountryState }));

describe("GET /api/radio/stations", () => {
  beforeEach(() => {
    vi.resetModules();
    getStationsByCountryState.mockReset();
  });

  it("returns 400 when countryCode or city is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/radio/stations?countryCode=FR"));
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

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test app/api/radio/stations/route.test.ts`
Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 3: Write `app/api/radio/stations/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getStationsByCountryState } from "@/lib/radio-api/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get("countryCode");
  const city = searchParams.get("city");

  if (!countryCode || !city) {
    return NextResponse.json({ error: "countryCode and city query params are required" }, { status: 400 });
  }

  try {
    const stations = await getStationsByCountryState(countryCode, city);
    return NextResponse.json(stations);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch stations", detail: String(err) }, { status: 502 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test app/api/radio/stations/route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/radio/stations/route.ts app/api/radio/stations/route.test.ts
git commit -m "feat: add /api/radio/stations route"
```

---

## Task 8: `StationCard` and `StationList`

**Files:**
- Create: `components/StationCard.tsx`, `components/StationList.tsx`
- Test: `components/StationCard.test.tsx`, `components/StationList.test.tsx`

**Interfaces:**
- Consumes: `Station` from `@/lib/radio-api/types`; `useStations()` from `@/lib/radio-api/hooks` (Task 5); `TECHNICAL_TEXT_CLASS`, `formatBitrate` from `@/lib/format` (Task 2b).
- Produces: `StationCard({ station, isPlaying, onPlay }: { station: Station; isPlaying: boolean; onPlay: (station: Station) => void })`; `StationList({ countryCode, city, nowPlayingId, onSelectStation }: { countryCode: string | null; city: string | null; nowPlayingId: string | null; onSelectStation: (station: Station) => void })` — both consumed by Task 10 (`app/page.tsx`).

- [ ] **Step 1: Write the failing test for `StationCard`**

`components/StationCard.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationCard } from "./StationCard";
import type { Station } from "@/lib/radio-api/types";

const station: Station = {
  id: "1",
  name: "Radio Test",
  url: "http://stream.example/live",
  country: "France",
  countryCode: "FR",
  language: "french",
  tags: ["pop"],
  votes: 10,
};

describe("StationCard", () => {
  it("renders station name and calls onPlay when clicked", async () => {
    const onPlay = vi.fn();
    render(<StationCard station={station} isPlaying={false} onPlay={onPlay} />);
    await userEvent.click(screen.getByText("Radio Test"));
    expect(onPlay).toHaveBeenCalledWith(station);
  });

  it("omits bitrate text when the API didn't return a bitrate", () => {
    render(<StationCard station={station} isPlaying={false} onPlay={vi.fn()} />);
    expect(screen.queryByText(/KBPS/)).not.toBeInTheDocument();
  });

  it("shows bitrate when present", () => {
    render(
      <StationCard station={{ ...station, bitrate: 128 }} isPlaying={false} onPlay={vi.fn()} />
    );
    expect(screen.getByText(/128 KBPS/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/StationCard.test.tsx`
Expected: FAIL with "Cannot find module './StationCard'"

- [ ] **Step 3: Write `components/StationCard.tsx`**

```tsx
import type { Station } from "@/lib/radio-api/types";
import { TECHNICAL_TEXT_CLASS, formatBitrate } from "@/lib/format";

interface StationCardProps {
  station: Station;
  isPlaying: boolean;
  onPlay: (station: Station) => void;
}

export function StationCard({ station, isPlaying, onPlay }: StationCardProps) {
  return (
    <button
      type="button"
      onClick={() => onPlay(station)}
      aria-pressed={isPlaying}
      data-testid="station-card"
      className="flex w-full items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-left transition hover:bg-white/5"
    >
      <div className="flex flex-col gap-1">
        <span className="text-base text-white">{station.name}</span>
        <span className={TECHNICAL_TEXT_CLASS}>
          {station.country}
          {station.language ? ` · ${station.language}` : ""}
          {station.tags.length > 0 ? ` · ${station.tags[0]}` : ""}
        </span>
      </div>
      {station.bitrate ? <span className={TECHNICAL_TEXT_CLASS}>{formatBitrate(station.bitrate)}</span> : null}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test components/StationCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for `StationList`**

`components/StationList.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StationList } from "./StationList";

const fetchMock = vi.fn();

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("StationList", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders nothing when no city is selected", () => {
    const { container } = renderWithClient(
      <StationList countryCode={null} city={null} nowPlayingId={null} onSelectStation={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a skeleton while loading, then real stations", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "1", name: "Radio Test", country: "France", countryCode: "FR", tags: [], votes: 1 },
      ],
    });
    renderWithClient(
      <StationList countryCode="FR" city="Paris" nowPlayingId={null} onSelectStation={vi.fn()} />
    );
    expect(screen.getByTestId("station-list-skeleton")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Radio Test")).toBeInTheDocument());
  });

  it("shows an error state when the fetch fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    renderWithClient(
      <StationList countryCode="FR" city="Paris" nowPlayingId={null} onSelectStation={vi.fn()} />
    );
    await waitFor(() => expect(screen.getByTestId("station-list-error")).toBeInTheDocument());
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test components/StationList.test.tsx`
Expected: FAIL with "Cannot find module './StationList'"

- [ ] **Step 7: Write `components/StationList.tsx`**

```tsx
"use client";

import { useStations } from "@/lib/radio-api/hooks";
import { StationCard } from "./StationCard";
import { TECHNICAL_TEXT_CLASS } from "@/lib/format";
import type { Station } from "@/lib/radio-api/types";

interface StationListProps {
  countryCode: string | null;
  city: string | null;
  nowPlayingId: string | null;
  onSelectStation: (station: Station) => void;
}

export function StationList({ countryCode, city, nowPlayingId, onSelectStation }: StationListProps) {
  const { data, isLoading, isError } = useStations(countryCode, city);

  if (!countryCode || !city) {
    return null;
  }

  if (isLoading) {
    return (
      <div data-testid="station-list-skeleton" className="flex flex-col gap-2 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded bg-white/5" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div data-testid="station-list-error" className={`p-4 ${TECHNICAL_TEXT_CLASS}`}>
        Signal lost. Try again.
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div data-testid="station-list-empty" className={`p-4 ${TECHNICAL_TEXT_CLASS}`}>
        No stations found.
      </div>
    );
  }

  return (
    <div data-testid="station-list">
      {data.map((station) => (
        <StationCard
          key={station.id}
          station={station}
          isPlaying={station.id === nowPlayingId}
          onPlay={onSelectStation}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test components/StationList.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add components/StationCard.tsx components/StationCard.test.tsx components/StationList.tsx components/StationList.test.tsx
git commit -m "feat: add StationCard and StationList components"
```

---

## Task 9: `AudioVisualizer`

**Files:**
- Create: `components/AudioVisualizer.tsx`
- Test: `components/AudioVisualizer.test.tsx`

**Interfaces:**
- Produces: `AudioVisualizer({ active }: { active: boolean })` — consumed by Task 10 (`RadioPlayer`).

- [ ] **Step 1: Write the failing test**

`components/AudioVisualizer.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AudioVisualizer } from "./AudioVisualizer";

describe("AudioVisualizer", () => {
  it("renders bars that animate when active", () => {
    render(<AudioVisualizer active />);
    const visualizer = screen.getByTestId("audio-visualizer");
    expect(visualizer.querySelectorAll("span")[0]).toHaveClass("animate-pulse");
  });

  it("renders static bars when inactive", () => {
    render(<AudioVisualizer active={false} />);
    const visualizer = screen.getByTestId("audio-visualizer");
    expect(visualizer.querySelectorAll("span")[0]).not.toHaveClass("animate-pulse");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/AudioVisualizer.test.tsx`
Expected: FAIL with "Cannot find module './AudioVisualizer'"

- [ ] **Step 3: Write `components/AudioVisualizer.tsx`**

```tsx
interface AudioVisualizerProps {
  active: boolean;
}

const BAR_HEIGHTS_PX = [6, 10, 8];

export function AudioVisualizer({ active }: AudioVisualizerProps) {
  return (
    <div data-testid="audio-visualizer" aria-hidden="true" className="flex h-4 items-end gap-0.5">
      {BAR_HEIGHTS_PX.map((height, i) => (
        <span
          key={i}
          className={`w-0.5 bg-white/70 ${active ? "animate-pulse" : ""}`}
          style={{ height: active ? `${height}px` : "3px" }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test components/AudioVisualizer.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add components/AudioVisualizer.tsx components/AudioVisualizer.test.tsx
git commit -m "feat: add AudioVisualizer component"
```

---

## Task 10: `RadioPlayer`

**Files:**
- Create: `components/RadioPlayer.tsx`
- Test: `components/RadioPlayer.test.tsx`

**Interfaces:**
- Consumes: `Station` from `@/lib/radio-api/types`; `AudioVisualizer` from `./AudioVisualizer` (Task 9); `TECHNICAL_TEXT_CLASS`, `formatBitrate` from `@/lib/format` (Task 2b).
- Produces: `RadioPlayer({ station }: { station: Station | null })` — consumed by Task 11 (`app/page.tsx`).

- [ ] **Step 1: Write the failing test**

`components/RadioPlayer.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioPlayer } from "./RadioPlayer";
import type { Station } from "@/lib/radio-api/types";

const station: Station = {
  id: "1",
  name: "Radio Test",
  url: "http://stream.example/live",
  fallbackUrl: "http://stream.example/fallback",
  country: "France",
  countryCode: "FR",
  tags: [],
  votes: 0,
};

beforeEach(() => {
  vi.stubGlobal(
    "HTMLMediaElement",
    class {
      play() {
        return Promise.resolve();
      }
      pause() {}
    }
  );
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

describe("RadioPlayer", () => {
  it("shows 'No station selected' when nothing is playing", () => {
    render(<RadioPlayer station={null} />);
    expect(screen.getByText("No station selected")).toBeInTheDocument();
  });

  it("shows TUNING… then TUNED IN once the stream can play", async () => {
    render(<RadioPlayer station={station} />);
    expect(screen.getByTestId("player-status")).toHaveTextContent("TUNING…");
    const audio = screen.getByTestId("radio-player").querySelector("audio")!;
    audio.dispatchEvent(new Event("canplay"));
    expect(screen.getByTestId("player-status")).toHaveTextContent("TUNED IN");
  });

  it("falls back to fallbackUrl on stream error, then shows SIGNAL LOST if that fails too", async () => {
    render(<RadioPlayer station={station} />);
    const audio = screen.getByTestId("radio-player").querySelector("audio")!;
    audio.dispatchEvent(new Event("error"));
    expect(audio.src).toContain("fallback");
    audio.dispatchEvent(new Event("error"));
    expect(screen.getByTestId("player-status")).toHaveTextContent("SIGNAL LOST");
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("retries the stream when Try again is clicked", async () => {
    render(<RadioPlayer station={{ ...station, fallbackUrl: undefined }} />);
    const audio = screen.getByTestId("radio-player").querySelector("audio")!;
    audio.dispatchEvent(new Event("error"));
    await userEvent.click(screen.getByText("Try again"));
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/RadioPlayer.test.tsx`
Expected: FAIL with "Cannot find module './RadioPlayer'"

- [ ] **Step 3: Write `components/RadioPlayer.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import type { Station } from "@/lib/radio-api/types";
import { TECHNICAL_TEXT_CLASS, formatBitrate } from "@/lib/format";
import { AudioVisualizer } from "./AudioVisualizer";

type PlayerStatus = "idle" | "tuning" | "tuned_in" | "signal_lost";

interface RadioPlayerProps {
  station: Station | null;
}

export function RadioPlayer({ station }: RadioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [volume, setVolume] = useState(0.8);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    if (!station) {
      setStatus("idle");
      return;
    }
    setUsingFallback(false);
    tune(station.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station]);

  function tune(url: string) {
    const audio = audioRef.current;
    if (!audio) return;
    setStatus("tuning");
    audio.src = url;
    audio.volume = volume;
    audio.play().catch(() => setStatus("signal_lost"));
  }

  function handleError() {
    if (station?.fallbackUrl && !usingFallback) {
      setUsingFallback(true);
      tune(station.fallbackUrl);
      return;
    }
    setStatus("signal_lost");
  }

  function handleCanPlay() {
    setStatus("tuned_in");
  }

  function handleTryAgain() {
    if (!station) return;
    tune(usingFallback && station.fallbackUrl ? station.fallbackUrl : station.url);
  }

  function togglePlayPause() {
    const audio = audioRef.current;
    if (!audio || !station) return;
    if (status === "tuned_in") {
      audio.pause();
      setStatus("idle");
    } else if (status === "idle") {
      tune(usingFallback && station.fallbackUrl ? station.fallbackUrl : station.url);
    }
  }

  function handleVolumeChange(e: ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value);
    setVolume(next);
    if (audioRef.current) {
      audioRef.current.volume = next;
    }
  }

  return (
    <div
      data-testid="radio-player"
      className="fixed inset-x-0 bottom-0 flex items-center justify-between gap-4 border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur"
    >
      <audio ref={audioRef} onError={handleError} onCanPlay={handleCanPlay} onWaiting={() => setStatus("tuning")} />
      {station ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-white">{station.name}</span>
            <span data-testid="player-status" className={TECHNICAL_TEXT_CLASS}>
              {status === "tuning" && "TUNING…"}
              {status === "tuned_in" && "TUNED IN"}
              {status === "signal_lost" && "SIGNAL LOST"}
              {status === "idle" && "PAUSED"}
              {station.bitrate ? ` · ${formatBitrate(station.bitrate)}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {status === "signal_lost" ? (
              <button type="button" onClick={handleTryAgain} className={TECHNICAL_TEXT_CLASS}>
                Try again
              </button>
            ) : (
              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={status === "tuned_in" ? "Pause" : "Play"}
              >
                {status === "tuned_in" ? <Pause size={18} /> : <Play size={18} />}
              </button>
            )}
            <Volume2 size={16} className="text-white/50" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
            />
            <AudioVisualizer active={status === "tuned_in"} />
          </div>
        </>
      ) : (
        <span className={TECHNICAL_TEXT_CLASS}>No station selected</span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test components/RadioPlayer.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/RadioPlayer.tsx components/RadioPlayer.test.tsx
git commit -m "feat: add RadioPlayer with TUNING/TUNED IN/SIGNAL LOST state machine and fallback stream"
```

---

## Task 11: `CityOverlay`

**Files:**
- Create: `components/CityOverlay.tsx`
- Test: `components/CityOverlay.test.tsx`

**Interfaces:**
- Consumes: `CityMarker` from `@/lib/radio-api/types`; `TECHNICAL_TEXT_CLASS`, `formatCityCountry`, `formatStationCount` from `@/lib/format` (Task 2b).
- Produces: `CityOverlay({ city }: { city: CityMarker | null })` — consumed by Task 12 (`app/page.tsx`).

- [ ] **Step 1: Write the failing test**

`components/CityOverlay.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CityOverlay } from "./CityOverlay";
import type { CityMarker } from "@/lib/radio-api/types";

const city: CityMarker = {
  city: "Paris",
  countryCode: "FR",
  countryName: "France",
  lat: 48.8566,
  lon: 2.3522,
  stationCount: 12,
};

describe("CityOverlay", () => {
  it("renders nothing when no city is selected", () => {
    const { container } = render(<CityOverlay city={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the city name with a trailing period, country, and station count", () => {
    render(<CityOverlay city={city} />);
    expect(screen.getByText("Paris.")).toBeInTheDocument();
    expect(screen.getByText("Paris, France")).toBeInTheDocument();
    expect(screen.getByText("12 stations")).toBeInTheDocument();
  });

  it("uses singular 'station' for a count of exactly 1", () => {
    render(<CityOverlay city={{ ...city, stationCount: 1 }} />);
    expect(screen.getByText("1 station")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/CityOverlay.test.tsx`
Expected: FAIL with "Cannot find module './CityOverlay'"

- [ ] **Step 3: Write `components/CityOverlay.tsx`**

```tsx
import type { CityMarker } from "@/lib/radio-api/types";
import { TECHNICAL_TEXT_CLASS, formatCityCountry, formatStationCount } from "@/lib/format";

interface CityOverlayProps {
  city: CityMarker | null;
}

export function CityOverlay({ city }: CityOverlayProps) {
  if (!city) {
    return null;
  }

  return (
    <div data-testid="city-overlay" className="flex flex-col gap-1 p-6">
      <h2 className="text-4xl text-white">{city.city}.</h2>
      <span className={TECHNICAL_TEXT_CLASS}>{formatCityCountry(city.city, city.countryName)}</span>
      <span className={TECHNICAL_TEXT_CLASS}>{formatStationCount(city.stationCount)}</span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test components/CityOverlay.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/CityOverlay.tsx components/CityOverlay.test.tsx
git commit -m "feat: add CityOverlay component"
```

---

## Task 12: `WorldMap`

**Files:**
- Create: `components/WorldMap.tsx`
- Test: `components/WorldMap.test.tsx`

**Interfaces:**
- Consumes: `CityMarker` from `@/lib/radio-api/types`; `maplibre-gl`.
- Produces: `WorldMap({ cities, onSelectCity }: { cities: CityMarker[]; onSelectCity: (city: CityMarker) => void })` — consumed by Task 13 (`app/page.tsx`).

- [ ] **Step 1: Write the failing test**

`components/WorldMap.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { CityMarker } from "@/lib/radio-api/types";

const markerInstances: { setLngLat: ReturnType<typeof vi.fn>; addTo: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn>; el: HTMLElement }[] = [];

class FakeMap {
  remove = vi.fn();
  constructor(public options: unknown) {}
}

class FakeMarker {
  el: HTMLElement;
  setLngLat = vi.fn().mockReturnThis();
  addTo = vi.fn().mockReturnThis();
  remove = vi.fn();
  constructor(opts: { element: HTMLElement }) {
    this.el = opts.element;
    markerInstances.push(this as unknown as (typeof markerInstances)[number]);
  }
}

vi.mock("maplibre-gl", () => ({
  default: { Map: FakeMap, Marker: FakeMarker },
}));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

const cities: CityMarker[] = [
  { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
];

describe("WorldMap", () => {
  beforeEach(() => {
    markerInstances.length = 0;
  });

  it("creates a marker per city at the correct coordinates", async () => {
    const { WorldMap } = await import("./WorldMap");
    render(<WorldMap cities={cities} onSelectCity={vi.fn()} />);
    expect(markerInstances).toHaveLength(1);
    expect(markerInstances[0].setLngLat).toHaveBeenCalledWith([2.3522, 48.8566]);
  });

  it("calls onSelectCity when a marker is clicked", async () => {
    const { WorldMap } = await import("./WorldMap");
    const onSelectCity = vi.fn();
    render(<WorldMap cities={cities} onSelectCity={onSelectCity} />);
    markerInstances[0].el.click();
    expect(onSelectCity).toHaveBeenCalledWith(cities[0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/WorldMap.test.tsx`
Expected: FAIL with "Cannot find module './WorldMap'"

- [ ] **Step 3: Write `components/WorldMap.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CityMarker } from "@/lib/radio-api/types";

interface WorldMapProps {
  cities: CityMarker[];
  onSelectCity: (city: CityMarker) => void;
}

const STYLE_URL = "https://demotiles.maplibre.org/style.json";

export function WorldMap({ cities, onSelectCity }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [0, 20],
      zoom: 1.5,
      attributionControl: false,
    });
    const map = mapRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = cities.map((city) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("data-testid", `city-marker-${city.city}`);
      el.className = "h-2 w-2 rounded-full bg-white/80";
      el.addEventListener("click", () => onSelectCity(city));
      return new maplibregl.Marker({ element: el }).setLngLat([city.lon, city.lat]).addTo(map);
    });
  }, [cities, onSelectCity]);

  return <div ref={containerRef} data-testid="world-map" className="h-full w-full" />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test components/WorldMap.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add components/WorldMap.tsx components/WorldMap.test.tsx
git commit -m "feat: add WorldMap component with MapLibre GL markers"
```

---

## Task 13: Wire the Explore page (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx` (replace the `create-next-app` default)
- Test: `app/page.test.tsx`

**Interfaces:**
- Consumes: `WorldMap` (Task 12), `CityOverlay` (Task 11), `StationList` (Task 8), `RadioPlayer` (Task 10), `useCityMarkers` (Task 5).

- [ ] **Step 1: Write the failing test**

`app/page.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("maplibre-gl", () => ({
  default: {
    Map: class {
      remove = vi.fn();
    },
    Marker: class {
      setLngLat = vi.fn().mockReturnThis();
      addTo = vi.fn().mockReturnThis();
      remove = vi.fn();
    },
  },
}));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

const fetchMock = vi.fn();

describe("ExplorePage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "HTMLMediaElement",
      class {
        play() {
          return Promise.resolve();
        }
        pause() {}
      }
    );
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it("renders the map, header, and player with no station selected", async () => {
    const { default: ExplorePage } = await import("./page");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ExplorePage />
      </QueryClientProvider>
    );
    expect(screen.getByText("Radio Atlas")).toBeInTheDocument();
    expect(screen.getByTestId("world-map")).toBeInTheDocument();
    expect(screen.getByText("No station selected")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test app/page.test.tsx`
Expected: FAIL (current `app/page.tsx` is the `create-next-app` default, doesn't render "Radio Atlas"/`world-map`)

- [ ] **Step 3: Write `app/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { WorldMap } from "@/components/WorldMap";
import { CityOverlay } from "@/components/CityOverlay";
import { StationList } from "@/components/StationList";
import { RadioPlayer } from "@/components/RadioPlayer";
import { useCityMarkers } from "@/lib/radio-api/hooks";
import type { CityMarker, Station } from "@/lib/radio-api/types";

export default function ExplorePage() {
  const { data: cities } = useCityMarkers();
  const [selectedCity, setSelectedCity] = useState<CityMarker | null>(null);
  const [nowPlaying, setNowPlaying] = useState<Station | null>(null);

  return (
    <main className="flex h-screen flex-col bg-black">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <span className="text-sm uppercase tracking-widest text-white">Radio Atlas</span>
      </header>
      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1">
          <WorldMap cities={cities ?? []} onSelectCity={setSelectedCity} />
        </div>
        {selectedCity ? (
          <aside className="w-80 overflow-y-auto border-l border-white/10">
            <CityOverlay city={selectedCity} />
            <StationList
              countryCode={selectedCity.countryCode}
              city={selectedCity.city}
              nowPlayingId={nowPlaying?.id ?? null}
              onSelectStation={setNowPlaying}
            />
          </aside>
        ) : null}
      </div>
      <RadioPlayer station={nowPlaying} />
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test app/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: all tests across every task pass

- [ ] **Step 6: Manual browser verification**

Run: `pnpm dev`, open `http://localhost:3000`. Confirm: map renders with markers, clicking a marker with real stations shows the city panel and a real station list, clicking Play on a real station plays audio and the status goes `TUNING…` → `TUNED IN`, volume slider works, an obviously broken station (or killing your network briefly) shows `SIGNAL LOST` + `TRY AGAIN`.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/page.test.tsx
git commit -m "feat: wire Explore page (map, city overlay, station list, player)"
```

---

## Definition of Done for Fase 1

- [ ] `pnpm test` passes with zero failures.
- [ ] `pnpm build` succeeds.
- [ ] Manual browser check from Task 13 Step 6 passes.
- [ ] No `TODO`, placeholder, or empty function anywhere in `app/`, `components/`, `lib/`, `data/`.
- [ ] Every station field shown in the UI traces back to a real Radio Browser API response (verified by reading `client.ts` normalization — no invented defaults beyond `undefined`/omission).
