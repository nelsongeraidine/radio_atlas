import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlayerProvider } from "@/lib/player-context";
import DiscoverPage from "./page";

let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn() }),
}));

function renderDiscover(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlayerProvider>
        {ui}
      </PlayerProvider>
    </QueryClientProvider>
  );
}

describe("DiscoverPage", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    vi.clearAllMocks();
  });

  it("renders discover header and editorial sections", () => {
    renderDiscover(<DiscoverPage />);
    expect(screen.getByRole("heading", { name: "Discover." })).toBeInTheDocument();
    expect(screen.getByText("Around the world")).toBeInTheDocument();
    expect(screen.getByText("Electronic")).toBeInTheDocument();
    expect(screen.getByText("Jazz")).toBeInTheDocument();
  });

  it("focuses and highlights section when genre query param is present", () => {
    mockSearchParams = new URLSearchParams("genre=Electronic");
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    renderDiscover(<DiscoverPage />);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    const matchBadges = screen.getAllByText("MATCH");
    expect(matchBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("opens global search when clicking search button", () => {
    renderDiscover(<DiscoverPage />);
    const searchBtn = screen.getByTestId("open-search");
    fireEvent.click(searchBtn);
    expect(screen.getByTestId("global-search-input")).toBeInTheDocument();
  });
});
