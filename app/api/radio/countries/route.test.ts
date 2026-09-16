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
