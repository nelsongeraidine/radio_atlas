"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CityMarker } from "@/lib/radio-api/types";
import { formatCityCountry } from "@/lib/format";

interface WorldMapProps {
  cities: CityMarker[];
  onSelectCity: (city: CityMarker) => void;
}

const STYLE_URL = "https://demotiles.maplibre.org/style.json";

export function WorldMap({ cities, onSelectCity }: WorldMapProps) {
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
      attributionControl: false,
    });
    const map = mapRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = cities.map((city) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("data-testid", `city-marker-${city.city}`);
      el.setAttribute("aria-label", formatCityCountry(city.city, city.countryName));
      el.className = "h-2 w-2 rounded-full bg-white/80";
      el.addEventListener("click", () => onSelectCity(city));
      return new MapLibreMarker({ element: el }).setLngLat([city.lon, city.lat]).addTo(map);
    });
  }, [cities, onSelectCity]);

  return <div ref={containerRef} data-testid="world-map" className="h-full w-full" />;
}
