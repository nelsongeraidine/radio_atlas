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
