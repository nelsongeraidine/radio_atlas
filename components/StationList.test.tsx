import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StationList } from "./StationList";

const fetchMock = vi.fn();

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("StationList", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders nothing when no city is selected", () => {
    const { container } = renderWithClient(
      <StationList countryCode={null} city={null} nowPlayingId={null} onSelectStation={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a skeleton while loading, then real stations", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "1", name: "Radio Test", country: "France", countryCode: "FR", tags: [], votes: 1 },
      ],
    });
    renderWithClient(
      <StationList countryCode="FR" city="Paris" nowPlayingId={null} onSelectStation={vi.fn()} />
    );
    expect(screen.getByTestId("station-list-skeleton")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Radio Test")).toBeInTheDocument());
  });

  it("shows an error state when the fetch fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    renderWithClient(
      <StationList countryCode="FR" city="Paris" nowPlayingId={null} onSelectStation={vi.fn()} />
    );
    await waitFor(() => expect(screen.getByTestId("station-list-error")).toBeInTheDocument());
  });
});
