import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlayerProvider } from "@/lib/player-context";
import { GlobalPlayer } from "@/components/GlobalPlayer";

let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("maplibre-gl", () => ({
  Map: class {
    remove = vi.fn();
    on = vi.fn();
    getLayer = vi.fn().mockReturnValue(undefined);
    setLayoutProperty = vi.fn();
    flyTo = vi.fn();
  },
  Marker: class {
    setLngLat = vi.fn().mockReturnThis();
    addTo = vi.fn().mockReturnThis();
    remove = vi.fn();
  },
}));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

const fetchMock = vi.fn();

function renderExplore(ui: React.ReactElement, client?: QueryClient) {
  const queryClient = client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlayerProvider>
        {ui}
        <GlobalPlayer />
      </PlayerProvider>
    </QueryClientProvider>
  );
}

describe("ExplorePage", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/radio/seed")) {
        return {
          ok: true,
          json: async () => [
            { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
          ],
        };
      }
      if (url.includes("/api/radio/countries")) {
        return { ok: true, json: async () => [{ name: "Japan", countryCode: "JP", stationCount: 80 }] };
      }
      return { ok: true, json: async () => [] };
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
    localStorage.setItem("radio-atlas:onboarding-done", "1");
  });

  it("renders the map, header, and player with no station selected", async () => {
    const { default: ExplorePage } = await import("./page");
    renderExplore(<ExplorePage />);
    expect(screen.getByRole("banner")).toHaveTextContent("Radio Atlas");
    expect(screen.getByTestId("world-map")).toBeInTheDocument();
    expect(screen.getByText("No station selected")).toBeInTheDocument();
  });

  it("shows a discreet loading indicator while city markers are being fetched", async () => {
    let resolveFetch: (value: unknown) => void;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );
    const { default: ExplorePage } = await import("./page");
    renderExplore(<ExplorePage />);

    expect(screen.getByTestId("city-markers-loading")).toBeInTheDocument();

    resolveFetch!({
      ok: true,
      json: async () => [],
    });
    expect(await screen.findByTestId("world-map")).toBeInTheDocument();
  });

  it("shows a discreet error indicator when city markers fail to load", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => ({ error: "down" }) });
    const { default: ExplorePage } = await import("./page");
    renderExplore(<ExplorePage />);

    expect(await screen.findByTestId("city-markers-error")).toBeInTheDocument();
  });

  it("opens the search palette when the header search button is clicked", async () => {
    const { default: ExplorePage } = await import("./page");
    renderExplore(<ExplorePage />);
    expect(screen.queryByTestId("global-search-overlay")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("open-search"));
    expect(screen.getByTestId("global-search-overlay")).toBeInTheDocument();
  });

  it("opens the search palette with the Ctrl+K shortcut", async () => {
    const { default: ExplorePage } = await import("./page");
    renderExplore(<ExplorePage />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByTestId("global-search-overlay")).toBeInTheDocument();
  });

  it("selecting a country in search shows its name and a country-wide station list", async () => {
    const { default: ExplorePage } = await import("./page");
    renderExplore(<ExplorePage />);
    fireEvent.click(screen.getByTestId("open-search"));
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Japan" } });
    await waitFor(() => expect(screen.getByTestId("global-search-result-country")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("global-search-result-country"));
    expect(screen.getByText(/Japan/)).toBeInTheDocument();
    expect(screen.queryByTestId("global-search-overlay")).not.toBeInTheDocument();
  });

  it("shows onboarding when user visits for the first time", async () => {
    localStorage.removeItem("radio-atlas:onboarding-done");
    const { default: ExplorePage } = await import("./page");
    renderExplore(<ExplorePage />);
    expect(screen.getByText("A world of sound.")).toBeInTheDocument();
  });

  it("auto-selects city when query params are present in URL", async () => {
    mockSearchParams = new URLSearchParams("city=Paris&cc=FR");
    const { default: ExplorePage } = await import("./page");
    renderExplore(<ExplorePage />);
    expect(await screen.findByText("Paris.")).toBeInTheDocument();
  });
});
