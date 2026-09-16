"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Shuffle, Search } from "lucide-react";
import { WorldMap } from "@/components/WorldMap";
import { CityOverlay } from "@/components/CityOverlay";
import { StationList } from "@/components/StationList";
import { RadioPlayer } from "@/components/RadioPlayer";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Spotlight } from "@/components/Spotlight";
import { Onboarding, shouldShowOnboarding } from "@/components/Onboarding";
import { useCityMarkers, useStations } from "@/lib/radio-api/hooks";
import { useFavorites, useRecentlyPlayed, useCitiesVisited } from "@/lib/library";
import { TECHNICAL_TEXT_CLASS } from "@/lib/format";
import type { CityMarker, Country, Station } from "@/lib/radio-api/types";

type Selection =
  | { type: "city"; city: CityMarker }
  | { type: "country"; countryCode: string; countryName: string };

function subscribeNoop() {
  return () => {};
}

// Rotating messages for "Take me somewhere" transition
const RANDOM_MESSAGES = [
  "Searching the airwaves…",
  "Spinning the globe…",
  "Picking a frequency…",
  "Somewhere out there…",
  "Finding a signal…",
];

export default function ExplorePage() {
  const { data: cities, isLoading, isError } = useCityMarkers();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [nowPlaying, setNowPlaying] = useState<Station | null>(null);
  const [nowPlayingIndex, setNowPlayingIndex] = useState(-1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [randomMessage, setRandomMessage] = useState("");
  const [flyToCity, setFlyToCity] = useState<CityMarker | null>(null);
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);
  const isClientOnboardingDone = useSyncExternalStore(
    subscribeNoop,
    () => !shouldShowOnboarding(),
    () => true
  );
  const showOnboarding = !isClientOnboardingDone && !dismissedOnboarding;

  // Library hooks
  const { isFavorited, toggleFavorite } = useFavorites();
  const { addToHistory } = useRecentlyPlayed();
  const { addCityVisited } = useCitiesVisited();

  // Playlist for prev/next navigation — the station list of the current selection
  const cityCode = selection?.type === "city" ? selection.city.countryCode : selection?.type === "country" ? selection.countryCode : null;
  const cityName = selection?.type === "city" ? selection.city.city : undefined;
  const { data: playlist = [] } = useStations(cityCode, cityName);

  // Ctrl+K / ⌘K shortcut
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSelectStation(station: Station) {
    const idx = playlist.findIndex((s) => s.id === station.id);
    setNowPlaying(station);
    setNowPlayingIndex(idx);
    addToHistory(station);
  }

  function handleNavigate(direction: "prev" | "next") {
    const nextIdx = direction === "prev" ? nowPlayingIndex - 1 : nowPlayingIndex + 1;
    const station = playlist[nextIdx];
    if (!station) return;
    setNowPlaying(station);
    setNowPlayingIndex(nextIdx);
    addToHistory(station);
  }

  function handleSelectCity(city: CityMarker) {
    setSelection({ type: "city", city });
    setFlyToCity(city);
    addCityVisited(city);
  }

  function handleSelectCountry(country: Country) {
    setSelection({ type: "country", countryCode: country.countryCode, countryName: country.name });
  }

  function handleTakeMeSomewhere() {
    if (!cities?.length) return;
    const msg = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
    setRandomMessage(msg);
    const random = cities[Math.floor(Math.random() * cities.length)];
    setTimeout(() => {
      handleSelectCity(random);
      setRandomMessage("");
    }, 1200);
  }

  return (
    <>
      {showOnboarding && <Onboarding onDone={() => setDismissedOnboarding(true)} />}

      <main className="flex h-screen flex-col bg-black">
        {/* ── Header ───────────────────────────────────────── */}
        <header className="flex items-center justify-between border-b border-white/8 px-6 py-3">
          {/* Brand + Nav */}
          <div className="flex items-center gap-8">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
              Radio Atlas
            </span>
            <nav className="flex items-center gap-6">
              <span className={`${TECHNICAL_TEXT_CLASS} border-b border-white pb-0.5 text-white`}>
                Explore
              </span>
              <Link href="/discover" className={`${TECHNICAL_TEXT_CLASS} transition-colors hover:text-white/80`}>
                Discover
              </Link>
              <Link href="/library" className={`${TECHNICAL_TEXT_CLASS} transition-colors hover:text-white/80`}>
                Library
              </Link>
            </nav>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Take me somewhere */}
            <button
              type="button"
              onClick={handleTakeMeSomewhere}
              className={`flex items-center gap-1.5 rounded border border-white/10 px-3 py-1.5 transition-colors hover:bg-white/5 ${TECHNICAL_TEXT_CLASS}`}
            >
              <Shuffle size={11} />
              Take me somewhere
            </button>

            {/* Search */}
            <button
              type="button"
              data-testid="open-search"
              onClick={() => setIsSearchOpen(true)}
              className={`flex items-center gap-2 rounded border border-white/10 px-3 py-1.5 transition-colors hover:bg-white/5 ${TECHNICAL_TEXT_CLASS}`}
            >
              <Search size={12} />
              Search
              <kbd className="text-white/30">⌘K</kbd>
            </button>
          </div>
        </header>

        {/* ── Main content ──────────────────────────────────── */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Map */}
          <div className="flex-1">
            <WorldMap
              cities={cities ?? []}
              onSelectCity={handleSelectCity}
              flyToCity={flyToCity}
            />
          </div>

          {/* Loading / error banners */}
          {isLoading && (
            <div
              data-testid="city-markers-loading"
              className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/80 px-4 py-1.5 ${TECHNICAL_TEXT_CLASS} backdrop-blur`}
            >
              Resolving stations…
            </div>
          )}
          {isError && (
            <div
              data-testid="city-markers-error"
              className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/80 px-4 py-1.5 ${TECHNICAL_TEXT_CLASS} backdrop-blur`}
            >
              Signal lost. Try again.
            </div>
          )}

          {/* "Take me somewhere" overlay message */}
          {randomMessage && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="animate-fade-in rounded-xl bg-black/80 px-8 py-4 backdrop-blur-md">
                <p className="text-lg font-light tracking-wide text-white">{randomMessage}</p>
              </div>
            </div>
          )}

          {/* Side panel */}
          {selection && (
            <aside className="flex w-80 flex-col overflow-hidden border-l border-white/8 bg-black/60 backdrop-blur-sm">
              {/* City or Country header */}
              {selection.type === "city" ? (
                <CityOverlay
                  city={selection.city}
                  allCities={cities ?? []}
                  onSelectCity={handleSelectCity}
                />
              ) : (
                <div className="animate-slide-in-right border-b border-white/8 p-6">
                  <h2 className="text-[2.25rem] font-light leading-none tracking-tight text-white">
                    {selection.countryName}.
                  </h2>
                  <span className={`mt-1 block ${TECHNICAL_TEXT_CLASS}`}>
                    All stations
                  </span>
                </div>
              )}

              {/* Spotlight (top 5 from this city/country) */}
              {playlist.length > 0 && (
                <Spotlight
                  stations={playlist}
                  nowPlayingId={nowPlaying?.id ?? null}
                  onPlay={handleSelectStation}
                />
              )}

              {/* Full station list */}
              <div className="flex-1 overflow-y-auto">
                <StationList
                  countryCode={
                    selection.type === "city"
                      ? selection.city.countryCode
                      : selection.countryCode
                  }
                  city={selection.type === "city" ? selection.city.city : undefined}
                  nowPlayingId={nowPlaying?.id ?? null}
                  onSelectStation={handleSelectStation}
                  isFavorited={isFavorited}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            </aside>
          )}
        </div>

        {/* ── Player ───────────────────────────────────────── */}
        <RadioPlayer
          station={nowPlaying}
          playlist={playlist}
          nowPlayingIndex={nowPlayingIndex}
          onNavigate={handleNavigate}
          isFavorited={nowPlaying ? isFavorited(nowPlaying) : false}
          onToggleFavorite={toggleFavorite}
        />

        {/* ── Search palette ───────────────────────────────── */}
        <GlobalSearch
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectStation={handleSelectStation}
          onSelectCity={handleSelectCity}
          onSelectCountry={handleSelectCountry}
        />
      </main>
    </>
  );
}
