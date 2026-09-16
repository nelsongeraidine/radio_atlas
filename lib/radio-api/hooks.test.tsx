import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const fetchMock = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("hooks", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("useCountries fetches and returns the country list", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ name: "France", countryCode: "FR", stationCount: 120 }],
    });
    const { useCountries } = await import("./hooks");
    const { result } = renderHook(() => useCountries(), { wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual([{ name: "France", countryCode: "FR", stationCount: 120 }])
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/radio/countries");
  });

  it("useStationSearch does not fetch when the query is empty", () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    return (async () => {
      const { useStationSearch } = await import("./hooks");
      const { result } = renderHook(() => useStationSearch(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(fetchMock).not.toHaveBeenCalled();
    })();
  });

  it("useStationSearch fetches matching stations for a non-empty query", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "1", name: "Jazz FM", country: "France", countryCode: "FR", tags: [], votes: 1 },
      ],
    });
    const { useStationSearch } = await import("./hooks");
    const { result } = renderHook(() => useStationSearch("jazz"), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("q=jazz");
  });
});
