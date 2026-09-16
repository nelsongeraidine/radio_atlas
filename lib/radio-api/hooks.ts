"use client";

import { useQuery } from "@tanstack/react-query";
import type { CityMarker, Station } from "./types";

export function useCityMarkers() {
  return useQuery({
    queryKey: ["radio", "seed"],
    queryFn: async (): Promise<CityMarker[]> => {
      const res = await fetch("/api/radio/seed");
      if (!res.ok) {
        throw new Error("Failed to load city markers");
      }
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useStations(countryCode: string | null, city: string | null) {
  return useQuery({
    queryKey: ["radio", "stations", countryCode, city],
    queryFn: async (): Promise<Station[]> => {
      const params = new URLSearchParams({ countryCode: countryCode as string, city: city as string });
      const res = await fetch(`/api/radio/stations?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load stations");
      }
      return res.json();
    },
    enabled: Boolean(countryCode && city),
    staleTime: 10 * 60 * 1000,
  });
}
