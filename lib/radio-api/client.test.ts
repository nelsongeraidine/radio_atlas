import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  afterEach(() => {
    vi.useRealTimers();
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

  it("getStateStationCount counts stations by country code, not country name", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { stationuuid: "a", name: "Station A" },
        { stationuuid: "b", name: "Station B" },
      ],
    });
    const { getStateStationCount } = await import("./client");
    const count = await getStateStationCount("US", "Los Angeles");
    expect(count).toBe(2);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("countrycode=US");
    expect(url).toContain("state=Los+Angeles");
    expect(url).not.toContain("/json/states/");
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

  it("aborts the request via AbortController after the 8s timeout elapses", async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;
    fetchMock.mockImplementation(
      (_url: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          capturedSignal = options.signal;
          options.signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );
    const { getCountries } = await import("./client");
    const promise = getCountries();
    // Attach the rejection assertion before advancing fake timers, so the
    // eventual rejection is never briefly unhandled.
    const assertion = expect(promise).rejects.toThrow();

    // Advance past the 8s timeout for mirror-a, then mirror-b (sequential calls).
    await vi.advanceTimersByTimeAsync(8000);
    await vi.advanceTimersByTimeAsync(8000);

    await assertion;
    expect(capturedSignal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
