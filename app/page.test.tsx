import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("maplibre-gl", () => ({
  default: {
    Map: class {
      remove = vi.fn();
    },
    Marker: class {
      setLngLat = vi.fn().mockReturnThis();
      addTo = vi.fn().mockReturnThis();
      remove = vi.fn();
    },
  },
}));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

const fetchMock = vi.fn();

describe("ExplorePage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "HTMLMediaElement",
      class {
        play() {
          return Promise.resolve();
        }
        pause() {}
      }
    );
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it("renders the map, header, and player with no station selected", async () => {
    const { default: ExplorePage } = await import("./page");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ExplorePage />
      </QueryClientProvider>
    );
    expect(screen.getByText("Radio Atlas")).toBeInTheDocument();
    expect(screen.getByTestId("world-map")).toBeInTheDocument();
    expect(screen.getByText("No station selected")).toBeInTheDocument();
  });
});
