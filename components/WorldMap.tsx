"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CityMarker } from "@/lib/radio-api/types";
import { formatCityCountry } from "@/lib/format";

interface WorldMapProps {
  cities: CityMarker[];
  onSelectCity: (city: CityMarker) => void;
  flyToCity?: CityMarker | null;
}

const STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Basemap place/POI labels compete visually with our own city markers (a "Berlin" label
// rendered right on top of our marker reads as a single white blob at city zoom levels).
// Country/state/continent/water labels stay for orientation; only city-and-finer labels go.
const HIDDEN_LAYER_IDS = [
  "place_hamlet",
  "place_suburbs",
  "place_villages",
  "place_town",
  "place_city_r6",
  "place_city_r5",
  "place_city_dot_r7",
  "place_city_dot_r4",
  "place_city_dot_r2",
  "place_city_dot_z7",
  "place_capital_dot_z7",
  "poi_stadium",
  "poi_park",
];

export function WorldMap({ cities, onSelectCity, flyToCity }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: [0, 20],
      zoom: 1.5,
      attributionControl: { compact: true },
    });
    const map = mapRef.current;
    map.on("load", () => {
      for (const layerId of HIDDEN_LAYER_IDS) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", "none");
        }
      }
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly to a city when selection comes from GlobalSearch or "Take me somewhere"
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToCity) return;
    map.flyTo({
      center: [flyToCity.lon, flyToCity.lat],
      zoom: 9,
      duration: 1800,
      essential: true,
    });
  }, [flyToCity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = cities.map((city) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("data-testid", `city-marker-${city.city}`);
      el.setAttribute("aria-label", formatCityCountry(city.city, city.countryName));
      // Outer wrapper for pulse ring
      el.className =
        "relative flex h-3 w-3 items-center justify-center rounded-full marker-pulse";
      // Inner dot
      el.innerHTML = `<span class="block h-2 w-2 rounded-full bg-white shadow-[0_0_4px_2px_rgba(255,255,255,0.5)] transition-transform duration-200 hover:scale-150"></span>`;
      el.addEventListener("click", () => onSelectCity(city));
      return new MapLibreMarker({ element: el }).setLngLat([city.lon, city.lat]).addTo(map);
    });
  }, [cities, onSelectCity]);

  return <div ref={containerRef} data-testid="world-map" className="h-full w-full" />;
}
