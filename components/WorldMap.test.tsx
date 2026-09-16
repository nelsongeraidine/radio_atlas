import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { CityMarker } from "@/lib/radio-api/types";

const markerInstances: { setLngLat: ReturnType<typeof vi.fn>; addTo: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn>; el: HTMLElement }[] = [];
const mapInstances: FakeMap[] = [];

class FakeMap {
  remove = vi.fn();
  on = vi.fn();
  getLayer = vi.fn().mockReturnValue(undefined);
  setLayoutProperty = vi.fn();
  flyTo = vi.fn();
  constructor(public options: unknown) {
    mapInstances.push(this);
  }
}

class FakeMarker {
  el: HTMLElement;
  setLngLat = vi.fn().mockReturnThis();
  addTo = vi.fn().mockReturnThis();
  remove = vi.fn();
  constructor(opts: { element: HTMLElement }) {
    this.el = opts.element;
    markerInstances.push(this as unknown as (typeof markerInstances)[number]);
  }
}

vi.mock("maplibre-gl", () => ({
  Map: FakeMap,
  Marker: FakeMarker,
}));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

const cities: CityMarker[] = [
  { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, stationCount: 12 },
];

describe("WorldMap", () => {
  beforeEach(() => {
    markerInstances.length = 0;
    mapInstances.length = 0;
  });

  it("creates a marker per city at the correct coordinates", async () => {
    const { WorldMap } = await import("./WorldMap");
    render(<WorldMap cities={cities} onSelectCity={vi.fn()} />);
    expect(markerInstances).toHaveLength(1);
    expect(markerInstances[0].setLngLat).toHaveBeenCalledWith([2.3522, 48.8566]);
    expect(markerInstances[0].el.getAttribute("aria-label")).toBe("Paris, France");
  });

  it("calls onSelectCity when a marker is clicked", async () => {
    const { WorldMap } = await import("./WorldMap");
    const onSelectCity = vi.fn();
    render(<WorldMap cities={cities} onSelectCity={onSelectCity} />);
    markerInstances[0].el.click();
    expect(onSelectCity).toHaveBeenCalledWith(cities[0]);
  });

  it("hides basemap place labels on load so they don't collide with city markers", async () => {
    const { WorldMap } = await import("./WorldMap");
    render(<WorldMap cities={cities} onSelectCity={vi.fn()} />);

    const mapInstance = mapInstances[0];
    expect(mapInstance.on).toHaveBeenCalledWith("load", expect.any(Function));
    const loadHandler = mapInstance.on.mock.calls[0][1] as () => void;

    mapInstance.getLayer.mockReturnValue({});
    loadHandler();

    expect(mapInstance.setLayoutProperty).toHaveBeenCalledWith("place_city_r6", "visibility", "none");
    expect(mapInstance.setLayoutProperty).toHaveBeenCalledWith("place_town", "visibility", "none");
  });
});
