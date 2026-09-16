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

  it("returns cached data on second call within TTL window, skipping API calls", async () => {
    // Reset modules and mocks once at the start, then keep the same module instance for both calls
    vi.resetModules();
    getStateStationCount.mockReset();
    getStateStationCount.mockImplementation(async (countryCode: string) =>
      countryCode === "FR" ? 12 : 0
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
