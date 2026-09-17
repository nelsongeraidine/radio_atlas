"use client";

import { useCallback, useEffect, useState } from "react";
import type { CityMarker, Station } from "./radio-api/types";

// ── Storage keys ─────────────────────────────────────────────
const KEY_FAVORITES = "radio-atlas:favorites";
const KEY_RECENTLY_PLAYED = "radio-atlas:recently-played";
const KEY_CITIES_VISITED = "radio-atlas:cities-visited";
const KEY_RECENT_SEARCHES = "radio-atlas:recent-searches";

const MAX_RECENTLY_PLAYED = 50;
const MAX_CITIES_VISITED = 100;
const MAX_RECENT_SEARCHES = 6;

// ── Serialisation helpers ────────────────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded or private mode — fail silently
  }
}

// ── useFavorites ─────────────────────────────────────────────
export function useFavorites() {
  const [favorites, setFavorites] = useState<Station[]>(() =>
    readJSON<Station[]>(KEY_FAVORITES, [])
  );

  // Keep localStorage in sync whenever state changes
  useEffect(() => {
    writeJSON(KEY_FAVORITES, favorites);
  }, [favorites]);

  const isFavorited = useCallback(
    (station: Station) => favorites.some((s) => s.id === station.id),
    [favorites]
  );

  const toggleFavorite = useCallback((station: Station) => {
    setFavorites((prev) => {
      const exists = prev.some((s) => s.id === station.id);
      return exists ? prev.filter((s) => s.id !== station.id) : [station, ...prev];
    });
  }, []);

  return { favorites, isFavorited, toggleFavorite };
}

// ── useRecentlyPlayed ────────────────────────────────────────
export function useRecentlyPlayed() {
  const [recentlyPlayed, setRecentlyPlayed] = useState<Station[]>(() =>
    readJSON<Station[]>(KEY_RECENTLY_PLAYED, [])
  );

  useEffect(() => {
    writeJSON(KEY_RECENTLY_PLAYED, recentlyPlayed);
  }, [recentlyPlayed]);

  const addToHistory = useCallback((station: Station) => {
    setRecentlyPlayed((prev) => {
      // Remove duplicate if already present, then prepend
      const deduped = prev.filter((s) => s.id !== station.id);
      return [station, ...deduped].slice(0, MAX_RECENTLY_PLAYED);
    });
  }, []);

  return { recentlyPlayed, addToHistory };
}

// ── useCitiesVisited ─────────────────────────────────────────
export function useCitiesVisited() {
  const [citiesVisited, setCitiesVisited] = useState<CityMarker[]>(() =>
    readJSON<CityMarker[]>(KEY_CITIES_VISITED, [])
  );

  useEffect(() => {
    writeJSON(KEY_CITIES_VISITED, citiesVisited);
  }, [citiesVisited]);

  const addCityVisited = useCallback((city: CityMarker) => {
    setCitiesVisited((prev) => {
      const key = `${city.countryCode}-${city.city}`;
      const deduped = prev.filter((c) => `${c.countryCode}-${c.city}` !== key);
      return [city, ...deduped].slice(0, MAX_CITIES_VISITED);
    });
  }, []);

  return { citiesVisited, addCityVisited };
}

// ── useRecentSearches ────────────────────────────────────────
export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    readJSON<string[]>(KEY_RECENT_SEARCHES, [])
  );

  useEffect(() => {
    writeJSON(KEY_RECENT_SEARCHES, recentSearches);
  }, [recentSearches]);

  const addRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const deduped = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...deduped].slice(0, MAX_RECENT_SEARCHES);
    });
  }, []);

  const removeRecentSearch = useCallback((term: string) => {
    setRecentSearches((prev) => prev.filter((s) => s.toLowerCase() !== term.toLowerCase()));
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  return { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches };
}
