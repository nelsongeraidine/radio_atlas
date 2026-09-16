import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CityOverlay } from "./CityOverlay";
import type { CityMarker } from "@/lib/radio-api/types";

const city: CityMarker = {
  city: "Paris",
  countryCode: "FR",
  countryName: "France",
  lat: 48.8566,
  lon: 2.3522,
  stationCount: 12,
};

describe("CityOverlay", () => {
  it("renders nothing when no city is selected", () => {
    const { container } = render(<CityOverlay city={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the city name with a trailing period, country, and station count", () => {
    render(<CityOverlay city={city} />);
    expect(screen.getByText("Paris.")).toBeInTheDocument();
    expect(screen.getByText("Paris, France")).toBeInTheDocument();
    expect(screen.getByText("12 stations")).toBeInTheDocument();
  });

  it("uses singular 'station' for a count of exactly 1", () => {
    render(<CityOverlay city={{ ...city, stationCount: 1 }} />);
    expect(screen.getByText("1 station")).toBeInTheDocument();
  });

  it("fires onScopeChange when LOCAL / WORLD is toggled", () => {
    const onScopeChange = vi.fn();
    render(<CityOverlay city={city} onScopeChange={onScopeChange} />);
    fireEvent.click(screen.getByText("WORLD"));
    expect(onScopeChange).toHaveBeenCalledWith("WORLD");
  });
});
