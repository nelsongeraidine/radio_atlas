"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { useCityMarkers, useCountries, useStationSearch } from "@/lib/radio-api/hooks";
import { TECHNICAL_TEXT_CLASS, formatCityCountry } from "@/lib/format";
import type { CityMarker, Country, Station } from "@/lib/radio-api/types";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation: (station: Station) => void;
  onSelectCity: (city: CityMarker) => void;
  onSelectCountry: (country: Country) => void;
}

type ResultItem =
  | { kind: "station"; station: Station }
  | { kind: "city"; city: CityMarker }
  | { kind: "country"; country: Country };

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function GlobalSearch({
  isOpen,
  onClose,
  onSelectStation,
  onSelectCity,
  onSelectCountry,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: cities } = useCityMarkers();
  const { data: countries } = useCountries();
  const {
    data: stations,
    isLoading: isStationsLoading,
    isError: isStationsError,
  } = useStationSearch(debouncedQuery);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const normalizedQuery = query.trim().toLowerCase();

  const cityResults = useMemo(() => {
    if (!normalizedQuery || !cities) return [];
    return cities.filter(
      (c) => c.city.toLowerCase().includes(normalizedQuery) || c.countryName.toLowerCase().includes(normalizedQuery)
    );
  }, [cities, normalizedQuery]);

  const countryResults = useMemo(() => {
    if (!normalizedQuery || !countries) return [];
    return countries.filter((c) => c.name.toLowerCase().includes(normalizedQuery));
  }, [countries, normalizedQuery]);

  const stationResults = normalizedQuery && stations ? stations : [];

  const results: ResultItem[] = useMemo(
    () => [
      ...stationResults.map((station): ResultItem => ({ kind: "station", station })),
      ...cityResults.map((city): ResultItem => ({ kind: "city", city })),
      ...countryResults.map((country): ResultItem => ({ kind: "country", country })),
    ],
    [stationResults, cityResults, countryResults]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  function selectItem(item: ResultItem) {
    if (item.kind === "station") onSelectStation(item.station);
    else if (item.kind === "city") onSelectCity(item.city);
    else onSelectCountry(item.country);
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = results[activeIndex];
      if (item) selectItem(item);
    }
  }

  if (!isOpen) {
    return null;
  }

  const cityOffset = stationResults.length;
  const countryOffset = stationResults.length + cityResults.length;

  return (
    <div
      data-testid="global-search-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-32 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl rounded-lg border border-white/10 bg-black shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <Search className="h-4 w-4 text-white/40" />
          <input
            ref={inputRef}
            data-testid="global-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find a frequency…"
            className="w-full bg-transparent text-lg text-white placeholder-white/40 outline-none"
          />
        </div>
        {normalizedQuery ? (
          <div className="max-h-96 overflow-y-auto">
            {stationResults.length > 0 ? (
              <div>
                <div className={`px-6 pt-3 ${TECHNICAL_TEXT_CLASS}`}>Radios</div>
                {stationResults.map((station, i) => (
                  <button
                    key={station.id}
                    type="button"
                    data-testid="global-search-result-station"
                    aria-selected={i === activeIndex}
                    onClick={() => selectItem({ kind: "station", station })}
                    className={`flex w-full items-center justify-between px-6 py-2 text-left ${
                      i === activeIndex ? "bg-white/10" : ""
                    }`}
                  >
                    <span className="text-white">{station.name}</span>
                    <span className={TECHNICAL_TEXT_CLASS}>
                      {station.countryCode}
                      {station.tags[0] ? ` · ${station.tags[0]}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {isStationsLoading ? (
              <div data-testid="global-search-radios-skeleton" className="px-6 py-2">
                <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
              </div>
            ) : null}
            {isStationsError ? (
              <div className={`px-6 py-2 ${TECHNICAL_TEXT_CLASS}`}>Signal lost. Try again.</div>
            ) : null}
            {cityResults.length > 0 ? (
              <div>
                <div className={`px-6 pt-3 ${TECHNICAL_TEXT_CLASS}`}>City</div>
                {cityResults.map((city, i) => (
                  <button
                    key={`${city.countryCode}-${city.city}`}
                    type="button"
                    data-testid="global-search-result-city"
                    aria-selected={cityOffset + i === activeIndex}
                    onClick={() => selectItem({ kind: "city", city })}
                    className={`flex w-full items-center justify-between px-6 py-2 text-left ${
                      cityOffset + i === activeIndex ? "bg-white/10" : ""
                    }`}
                  >
                    <span className="text-white">{city.city}.</span>
                    <span className={TECHNICAL_TEXT_CLASS}>{formatCityCountry(city.city, city.countryName)}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {countryResults.length > 0 ? (
              <div>
                <div className={`px-6 pt-3 ${TECHNICAL_TEXT_CLASS}`}>Country</div>
                {countryResults.map((country, i) => (
                  <button
                    key={country.countryCode}
                    type="button"
                    data-testid="global-search-result-country"
                    aria-selected={countryOffset + i === activeIndex}
                    onClick={() => selectItem({ kind: "country", country })}
                    className={`flex w-full items-center justify-between px-6 py-2 text-left ${
                      countryOffset + i === activeIndex ? "bg-white/10" : ""
                    }`}
                  >
                    <span className="text-white">{country.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
