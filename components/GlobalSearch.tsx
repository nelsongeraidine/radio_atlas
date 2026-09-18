"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Clock, Search, X } from "lucide-react";
import { useCityMarkers, useCountries, useStationSearch } from "@/lib/radio-api/hooks";
import { useRecentSearches } from "@/lib/library";
import { TECHNICAL_TEXT_CLASS, formatCityCountry } from "@/lib/format";
import type { CityMarker, Country, Station } from "@/lib/radio-api/types";

export const CURATED_GENRES = [
  "Ambient",
  "Classical",
  "Country",
  "Dance",
  "Electronic",
  "Hip Hop",
  "House",
  "Indie",
  "Jazz",
  "Latin",
  "Metal",
  "News",
  "Pop",
  "Reggae",
  "Rock",
  "Soul",
  "Talk",
  "Techno",
] as const;

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation: (station: Station) => void;
  onSelectCity: (city: CityMarker) => void;
  onSelectCountry: (country: Country) => void;
  onSelectGenre?: (genre: string) => void;
}

type ResultItem =
  | { kind: "station"; station: Station }
  | { kind: "city"; city: CityMarker }
  | { kind: "country"; country: Country }
  | { kind: "genre"; genre: string };

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
  onSelectGenre,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } = useRecentSearches();
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
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
      // Small delay so the animation starts before focus-stealing the input
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
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

  const genreResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return CURATED_GENRES.filter((g) =>
      g.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  const stationResults = useMemo(() => {
    return normalizedQuery && stations ? stations : [];
  }, [normalizedQuery, stations]);

  const results: ResultItem[] = useMemo(
    () => [
      ...stationResults.map((station): ResultItem => ({ kind: "station", station })),
      ...cityResults.map((city): ResultItem => ({ kind: "city", city })),
      ...countryResults.map((country): ResultItem => ({ kind: "country", country })),
      ...genreResults.map((genre): ResultItem => ({ kind: "genre", genre })),
    ],
    [stationResults, cityResults, countryResults, genreResults]
  );

  const [prevResultsLength, setPrevResultsLength] = useState(results.length);
  if (results.length !== prevResultsLength) {
    setPrevResultsLength(results.length);
    setActiveIndex(0);
  }

  function selectItem(item: ResultItem) {
    if (query.trim()) {
      addRecentSearch(query.trim());
    }
    if (item.kind === "station") onSelectStation(item.station);
    else if (item.kind === "city") onSelectCity(item.city);
    else if (item.kind === "country") onSelectCountry(item.country);
    else if (item.kind === "genre") onSelectGenre?.(item.genre);
    onClose();
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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
  const genreOffset = stationResults.length + cityResults.length + countryResults.length;
  const hasResults =
    stationResults.length > 0 ||
    cityResults.length > 0 ||
    countryResults.length > 0 ||
    genreResults.length > 0;

  return (
    <div
      data-testid="global-search-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-24 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onKeyDown={handleDialogKeyDown}
        className="animate-fade-in w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] shadow-2xl"
      >
        {/* Input bar */}
        <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
          <Search className="h-4 w-4 flex-shrink-0 text-white/30" />
          <input
            ref={inputRef}
            data-testid="global-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find a frequency…"
            className="min-w-0 flex-1 bg-transparent text-base text-white placeholder-white/25 outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center text-white/30 hover:text-white/60"
            >
              <X size={14} />
            </button>
          )}
          <kbd className={`flex-shrink-0 rounded border border-white/10 px-1.5 py-0.5 ${TECHNICAL_TEXT_CLASS}`}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        {normalizedQuery ? (
          <div className="max-h-[400px] overflow-y-auto">
            {/* RADIOS section */}
            {isStationsLoading ? (
              <div data-testid="global-search-radios-skeleton" className="px-5 py-3">
                <div className={`mb-2 ${TECHNICAL_TEXT_CLASS}`}>Radios</div>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="mb-2 h-8 animate-pulse rounded bg-white/5" />
                ))}
              </div>
            ) : null}
            {isStationsError && (
              <div className={`px-5 py-3 ${TECHNICAL_TEXT_CLASS}`}>Signal lost. Try again.</div>
            )}
            {stationResults.length > 0 && (
              <div>
                <div className={`px-5 pb-1 pt-3 ${TECHNICAL_TEXT_CLASS}`}>Radios</div>
                {stationResults.map((station, i) => (
                  <button
                    key={station.id}
                    type="button"
                    role="option"
                    data-testid="global-search-result-station"
                    aria-selected={i === activeIndex}
                    onClick={() => selectItem({ kind: "station", station })}
                    className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors duration-100 ${
                      i === activeIndex ? "bg-white/8" : "hover:bg-white/5"
                    }`}
                  >
                    {station.favicon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={station.favicon}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="h-6 w-6 rounded object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-white">{station.name}</span>
                    <span className={`flex-shrink-0 ${TECHNICAL_TEXT_CLASS}`}>
                      {station.countryCode}
                      {station.tags[0] ? ` · ${station.tags[0].toUpperCase()}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* CITY section */}
            {cityResults.length > 0 && (
              <div>
                <div className={`px-5 pb-1 pt-3 ${TECHNICAL_TEXT_CLASS}`}>City</div>
                {cityResults.map((city, i) => (
                  <button
                    key={`${city.countryCode}-${city.city}`}
                    type="button"
                    role="option"
                    data-testid="global-search-result-city"
                    aria-selected={cityOffset + i === activeIndex}
                    onClick={() => selectItem({ kind: "city", city })}
                    className={`flex w-full items-center justify-between px-5 py-2.5 text-left transition-colors duration-100 ${
                      cityOffset + i === activeIndex ? "bg-white/8" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="text-sm text-white">{city.city}.</span>
                    <span className={TECHNICAL_TEXT_CLASS}>{formatCityCountry(city.city, city.countryName)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* COUNTRY section */}
            {countryResults.length > 0 && (
              <div>
                <div className={`px-5 pb-1 pt-3 ${TECHNICAL_TEXT_CLASS}`}>Country</div>
                {countryResults.map((country, i) => (
                  <button
                    key={country.countryCode}
                    type="button"
                    role="option"
                    data-testid="global-search-result-country"
                    aria-selected={countryOffset + i === activeIndex}
                    onClick={() => selectItem({ kind: "country", country })}
                    className={`flex w-full items-center justify-between px-5 py-2.5 text-left transition-colors duration-100 ${
                      countryOffset + i === activeIndex ? "bg-white/8" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="text-sm text-white">{country.name}</span>
                    <span className={TECHNICAL_TEXT_CLASS}>{country.stationCount} stations</span>
                  </button>
                ))}
              </div>
            )}

            {/* GENRES section */}
            {genreResults.length > 0 && (
              <div>
                <div className={`px-5 pb-1 pt-3 ${TECHNICAL_TEXT_CLASS}`}>Genres</div>
                {genreResults.map((genre, i) => (
                  <button
                    key={genre}
                    type="button"
                    role="option"
                    data-testid="global-search-result-genre"
                    aria-selected={genreOffset + i === activeIndex}
                    onClick={() => selectItem({ kind: "genre", genre })}
                    className={`flex w-full items-center justify-between px-5 py-2.5 text-left transition-colors duration-100 ${
                      genreOffset + i === activeIndex ? "bg-white/8" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="text-sm text-white">{genre}</span>
                    <span className={TECHNICAL_TEXT_CLASS}>GENRE</span>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isStationsLoading && !hasResults && (
              <div className={`px-5 py-6 text-center ${TECHNICAL_TEXT_CLASS}`}>
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            <div className="h-2" />
          </div>
        ) : recentSearches.length > 0 ? (
          <div data-testid="global-search-recent" className="py-2">
            <div className="flex items-center justify-between px-5 pb-1 pt-2">
              <span className={TECHNICAL_TEXT_CLASS}>Recent searches</span>
              <button
                type="button"
                data-testid="global-search-clear-recent"
                onClick={clearRecentSearches}
                className={`flex min-h-11 items-center text-[10px] text-white/30 hover:text-white/60 transition-colors ${TECHNICAL_TEXT_CLASS}`}
              >
                Clear
              </button>
            </div>
            {recentSearches.map((term) => (
              <div
                key={term}
                className="group flex w-full items-center justify-between px-5 py-1.5 hover:bg-white/5 transition-colors"
              >
                <button
                  type="button"
                  data-testid="global-search-recent-item"
                  onClick={() => setQuery(term)}
                  className="flex flex-1 items-center gap-3 text-left text-sm text-white/70 group-hover:text-white transition-colors truncate"
                >
                  <Clock size={13} className="text-white/30 flex-shrink-0" />
                  <span className="truncate">{term}</span>
                </button>
                <button
                  type="button"
                  data-testid={`remove-recent-${term}`}
                  aria-label={`Remove ${term} from recent searches`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentSearch(term);
                  }}
                  className="flex min-h-9 min-w-9 items-center justify-center rounded text-white/30 opacity-60 hover:text-white/80 hover:opacity-100 focus-visible:opacity-100 transition-all duration-150 flex-shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Hint when empty */
          <div className={`px-5 py-4 ${TECHNICAL_TEXT_CLASS}`}>
            Search radios, cities, countries or genres
          </div>
        )}
      </div>
    </div>
  );
}
