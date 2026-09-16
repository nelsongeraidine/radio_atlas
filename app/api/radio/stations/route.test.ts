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
