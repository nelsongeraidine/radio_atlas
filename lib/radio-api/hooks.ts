"use client";

import { useQuery } from "@tanstack/react-query";
import type { CityMarker, Country, Station } from "./types";

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

export function useStations(countryCode: string | null, city?: string | null) {
  return useQuery({
    queryKey: ["radio", "stations", countryCode, city ?? null],
    queryFn: async (): Promise<Station[]> => {
      const params = new URLSearchParams({ countryCode: countryCode as string });
      if (city) {
        params.set("city", city);
      }
      const res = await fetch(`/api/radio/stations?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load stations");
      }
      return res.json();
    },
    enabled: Boolean(countryCode),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCountries() {
  return useQuery({
    queryKey: ["radio", "countries"],
    queryFn: async (): Promise<Country[]> => {
      const res = await fetch("/api/radio/countries");
      if (!res.ok) {
        throw new Error("Failed to load countries");
      }
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useStationSearch(query: string) {
  return useQuery({
    queryKey: ["radio", "search", query],
    queryFn: async (): Promise<Station[]> => {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(`/api/radio/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to search stations");
      }
      return res.json();
    },
    enabled: query.trim().length > 0,
    staleTime: 60 * 1000,
  });
}
