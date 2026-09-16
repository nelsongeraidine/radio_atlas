import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalSearch } from "./GlobalSearch";

const fetchMock = vi.fn();

const CITIES = [
  { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
  { city: "Tokyo", countryCode: "JP", countryName: "Japan", lat: 35.6762, lon: 139.6503, stationCount: 8 },
];
const COUNTRIES = [
  { name: "France", countryCode: "FR", stationCount: 120 },
  { name: "Japan", countryCode: "JP", stationCount: 80 },
];

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function mockFetchImpl(searchImpl?: (q: string) => unknown[]) {
  return async (url: string) => {
    if (url.includes("/api/radio/seed")) return { ok: true, json: async () => CITIES };
    if (url.includes("/api/radio/countries")) return { ok: true, json: async () => COUNTRIES };
    if (url.includes("/api/radio/search")) {
      const q = new URL(url, "http://localhost").searchParams.get("q") ?? "";
      return { ok: true, json: async () => (searchImpl ? searchImpl(q) : []) };
    }
    return { ok: true, json: async () => [] };
  };
}

const JAZZ_STATION = { id: "1", name: "Paris Jazz", country: "France", countryCode: "FR", tags: ["jazz"], votes: 3 };

describe("GlobalSearch", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      mockFetchImpl((q) => (q.toLowerCase().includes("jazz") ? [JAZZ_STATION] : []))
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders nothing when closed", () => {
    const { container } = renderWithClient(
      <GlobalSearch isOpen={false} onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the input and no results when opened with an empty query", () => {
    renderWithClient(
      <GlobalSearch isOpen onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    expect(screen.getByTestId("global-search-input")).toBeInTheDocument();
    expect(screen.queryByTestId("global-search-result-city")).not.toBeInTheDocument();
  });

  it("filters cities and countries synchronously as the user types", async () => {
    renderWithClient(
      <GlobalSearch isOpen onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/radio/seed"));
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Par" } });
    await waitFor(() => expect(screen.getAllByTestId("global-search-result-city")).toHaveLength(1));
    expect(screen.getByText("Paris.")).toBeInTheDocument();
    expect(screen.queryByText("Tokyo.")).not.toBeInTheDocument();
  });

  it("shows a skeleton while the radio search is in flight, then the result", async () => {
    let resolveSearch!: (value: unknown) => void;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/radio/seed")) return { ok: true, json: async () => CITIES };
      if (url.includes("/api/radio/countries")) return { ok: true, json: async () => COUNTRIES };
      if (url.includes("/api/radio/search")) {
        return new Promise((resolve) => {
          resolveSearch = resolve;
        });
      }
      return { ok: true, json: async () => [] };
    });
    renderWithClient(
      <GlobalSearch isOpen onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "jazz" } });
    await waitFor(() => {
      expect(screen.getByTestId("global-search-radios-skeleton")).toBeInTheDocument();
      expect(resolveSearch).toBeDefined();
    });
    resolveSearch({ ok: true, json: async () => [JAZZ_STATION] });
    await waitFor(() => expect(screen.getByTestId("global-search-result-station")).toBeInTheDocument());
  });

  it("calls onSelectStation and onClose when a radio result is clicked", async () => {
    const onSelectStation = vi.fn();
    const onClose = vi.fn();
    renderWithClient(
      <GlobalSearch isOpen onClose={onClose} onSelectStation={onSelectStation} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "jazz" } });
    await waitFor(() => expect(screen.getByTestId("global-search-result-station")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("global-search-result-station"));
    expect(onSelectStation).toHaveBeenCalledWith(expect.objectContaining({ id: "1", name: "Paris Jazz" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSelectCountry when a country result is clicked", async () => {
    const onSelectCountry = vi.fn();
    renderWithClient(
      <GlobalSearch isOpen onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={onSelectCountry} />
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/radio/countries"));
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Japan" } });
    await waitFor(() => expect(screen.getByTestId("global-search-result-country")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("global-search-result-country"));
    expect(onSelectCountry).toHaveBeenCalledWith(expect.objectContaining({ countryCode: "JP" }));
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderWithClient(
      <GlobalSearch isOpen onClose={onClose} onSelectStation={vi.fn()} onSelectCity={vi.fn()} onSelectCountry={vi.fn()} />
    );
    fireEvent.keyDown(screen.getByTestId("global-search-input"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("selects the highlighted result with Enter", async () => {
    const onSelectCity = vi.fn();
    renderWithClient(
      <GlobalSearch isOpen onClose={vi.fn()} onSelectStation={vi.fn()} onSelectCity={onSelectCity} onSelectCountry={vi.fn()} />
    );
    fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Tokyo" } });
    await waitFor(() => expect(screen.getByTestId("global-search-result-city")).toBeInTheDocument());
    // "Tokyo" matches no station and no country, so the single city result is already at
    // index 0 -- Enter alone selects it without needing ArrowDown first.
    fireEvent.keyDown(screen.getByTestId("global-search-input"), { key: "Enter" });
    expect(onSelectCity).toHaveBeenCalledWith(expect.objectContaining({ city: "Tokyo" }));
  });
});
