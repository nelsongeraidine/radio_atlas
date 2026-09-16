import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolveSrv } = vi.hoisted(() => ({
  resolveSrv: vi.fn(),
}));

vi.mock("node:dns", () => ({
  promises: {
    resolveSrv: (...args: unknown[]) => resolveSrv(...args),
  },
  default: {
    promises: {
      resolveSrv: (...args: unknown[]) => resolveSrv(...args),
    },
  },
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

  it("falls back to a fixed mirror list when DNS resolution returns empty array", async () => {
    resolveSrv.mockResolvedValue([]);
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
