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
