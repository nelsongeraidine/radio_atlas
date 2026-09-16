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
