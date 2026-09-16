import { beforeEach, describe, expect, it, vi } from "vitest";

const getStateStationCount = vi.fn();

const DEFAULT_CITIES = [
  { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522 },
  { city: "Nowhere", countryCode: "XX", countryName: "Nowhereland", lat: 0, lon: 0 },
];

vi.mock("@/lib/radio-api/client", () => ({ getStateStationCount }));
vi.mock("@/data/cities.json", () => ({ default: DEFAULT_CITIES }));

describe("GET /api/radio/seed", () => {
  beforeEach(() => {
    // Re-assert the default fixture every test: vi.doMock (used by the concurrency test below
    // to swap in a larger city list) overrides the module for all subsequent dynamic imports
    // until something re-registers it, so every test must restore its own expected fixture.
    vi.doMock("@/data/cities.json", () => ({ default: DEFAULT_CITIES }));
    vi.resetModules();
    getStateStationCount.mockReset();
  });

  it("returns only cities with at least one real station", async () => {
    getStateStationCount.mockImplementation(async (countryName: string) =>
      countryName === "France" ? 12 : 0
    );
    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([
      { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
    ]);
  });

  it("excludes a city whose lookup failed, without failing the whole request or caching it as a real zero", async () => {
    getStateStationCount.mockImplementation(async (countryName: string) => {
      if (countryName === "France") return 12;
      throw new Error("mirror down");
    });
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    // Nowhereland (XX) failed transiently and must not show up at all -- neither as a real
    // empty-city zero, nor merged indistinguishably with a successful zero-station city.
    expect(body).toEqual([
      { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
    ]);
  });

  it("returns 502 when every single city lookup fails (full Radio Browser outage)", async () => {
    getStateStationCount.mockRejectedValue(new Error("mirror down"));
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("bounds concurrency instead of firing every city lookup simultaneously", async () => {
    // 20 cities, concurrency limit is 8 -- track the max number of in-flight calls at once.
    vi.resetModules();
    const manyCities = Array.from({ length: 20 }, (_, i) => ({
      city: `City${i}`,
      countryCode: "FR",
      countryName: "France",
      lat: 0,
      lon: 0,
    }));
    vi.doMock("@/data/cities.json", () => ({ default: manyCities }));

    let inFlight = 0;
    let maxInFlight = 0;
    getStateStationCount.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;
      return 1;
    });

    const { GET } = await import("./route");
    await GET();
    expect(maxInFlight).toBeLessThanOrEqual(8);
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it("returns cached data on second call within TTL window, skipping API calls", async () => {
    // Reset modules and mocks once at the start, then keep the same module instance for both calls
    vi.resetModules();
    getStateStationCount.mockReset();
    getStateStationCount.mockImplementation(async (countryName: string) =>
      countryName === "France" ? 12 : 0
    );

    const { GET } = await import("./route");

    // First call - should call getStateStationCount for each city
    const res1 = await GET();
    const body1 = await res1.json();
    expect(body1).toEqual([
      { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
    ]);

    // Track call count after first GET
    const callCountAfterFirstGet = getStateStationCount.mock.calls.length;
    expect(callCountAfterFirstGet).toBe(2); // Called once per city (FR and XX)

    // Second call - should return cached data without calling getStateStationCount again
    const res2 = await GET();
    const body2 = await res2.json();
    expect(body2).toEqual([
      { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
    ]);

    // Verify mock was not called again - call count should remain the same
    expect(getStateStationCount.mock.calls.length).toBe(callCountAfterFirstGet);
  });
});
