"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shuffle, Search } from "lucide-react";
import { WorldMap } from "@/components/WorldMap";
import { CityOverlay } from "@/components/CityOverlay";
import { StationList } from "@/components/StationList";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Spotlight } from "@/components/Spotlight";
import { Onboarding, shouldShowOnboarding } from "@/components/Onboarding";
import { useCityMarkers, useStations } from "@/lib/radio-api/hooks";
import { useCitiesVisited } from "@/lib/library";
import { usePlayer } from "@/lib/player-context";
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

function ExploreContent() {
  const { data: cities, isLoading, isError } = useCityMarkers();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [randomMessage, setRandomMessage] = useState("");
  const [flyToCity, setFlyToCity] = useState<CityMarker | null>(null);
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<"LOCAL" | "WORLD">("LOCAL");
  const router = useRouter();

  const isClientOnboardingDone = useSyncExternalStore(
    subscribeNoop,
    () => !shouldShowOnboarding(),
    () => true
  );
  const showOnboarding = !isClientOnboardingDone && !dismissedOnboarding;

  // Global player context
  const {
    nowPlaying,
    playStation,
    setPlaylist,
    isFavorited,
    toggleFavorite,
  } = usePlayer();

  const { addCityVisited } = useCitiesVisited();

  // Stations for current selection
  const cityCode =
    selection?.type === "city"
      ? selection.city.countryCode
      : selection?.type === "country"
      ? selection.countryCode
      : null;
  const cityName =
    selection?.type === "city" && scopeFilter === "LOCAL"
      ? selection.city.city
      : undefined;
  const { data: selectionStations = [] } = useStations(cityCode, cityName);

  // Keep player playlist synced with selection stations
  useEffect(() => {
    if (selectionStations.length > 0) {
      setPlaylist(selectionStations);
    }
  }, [selectionStations, setPlaylist]);

  // Deep linking via URL params: ?city=Paris&cc=FR or ?cc=JP
  const searchParams = useSearchParams();
  const paramCity = searchParams?.get("city");
  const paramCc = searchParams?.get("cc");
  const paramStation = searchParams?.get("station");

  const [lastParamsKey, setLastParamsKey] = useState("");
  const currentParamsKey = `${paramCity || ""}-${paramCc || ""}`;

  if (cities?.length && currentParamsKey !== "-" && currentParamsKey !== lastParamsKey) {
    setLastParamsKey(currentParamsKey);
    if (paramCity && paramCc) {
      const found = cities.find(
        (c) =>
          c.city.toLowerCase() === paramCity.toLowerCase() &&
          c.countryCode.toUpperCase() === paramCc.toUpperCase()
      );
      if (found) {
        setSelection({ type: "city", city: found });
        setFlyToCity(found);
      }
    } else if (paramCc) {
      setSelection({
        type: "country",
        countryCode: paramCc.toUpperCase(),
        countryName: paramCc.toUpperCase(),
      });
    }
  }

  // Auto-play station if ?station=id param matches a station
  useEffect(() => {
    if (!paramStation || !selectionStations.length) return;
    const target = selectionStations.find((s) => s.id === paramStation);
    if (target && nowPlaying?.id !== target.id) {
      playStation(target, selectionStations);
    }
  }, [selectionStations, paramStation, nowPlaying, playStation]);

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
    playStation(station, selectionStations);
  }

  function handleSelectCity(city: CityMarker) {
    setSelection({ type: "city", city });
    setFlyToCity(city);
    setScopeFilter("LOCAL");
    addCityVisited(city);
  }

  function handleSelectCountry(country: Country) {
    setSelection({ type: "country", countryCode: country.countryCode, countryName: country.name });
  }

  function handleSelectGenre(genre: string) {
    router.push(`/discover?genre=${encodeURIComponent(genre)}`);
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

      <main className="flex h-full flex-col bg-black">
        {/* ── Header ───────────────────────────────────────── */}
        <header className="flex items-center justify-between border-b border-white/8 px-4 sm:px-6 py-3">
          {/* Brand + Nav */}
          <div className="flex items-center gap-4 sm:gap-8">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
              Radio Atlas
            </span>
            <nav className="flex items-center gap-4 sm:gap-6">
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
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Take me somewhere */}
            <button
              type="button"
              onClick={handleTakeMeSomewhere}
              className={`flex items-center gap-1.5 rounded border border-white/10 px-2.5 sm:px-3 py-1.5 transition-colors hover:bg-white/5 ${TECHNICAL_TEXT_CLASS}`}
            >
              <Shuffle size={11} />
              <span className="hidden sm:inline">Take me somewhere</span>
              <span className="sm:hidden">Shuffle</span>
            </button>

            {/* Search */}
            <button
              type="button"
              data-testid="open-search"
              onClick={() => setIsSearchOpen(true)}
              className={`flex items-center gap-2 rounded border border-white/10 px-2.5 sm:px-3 py-1.5 transition-colors hover:bg-white/5 ${TECHNICAL_TEXT_CLASS}`}
            >
              <Search size={12} />
              <span>Search</span>
              <kbd className="hidden sm:inline text-white/30">⌘K</kbd>
            </button>
          </div>
        </header>

        {/* ── Main content ──────────────────────────────────── */}
        {/*
          Mobile layout strategy (when selection open):
          - Outer container: relative, h = 100% of flex-1 (bounded)
          - Map: absolute top-0 left-0 right-0 h-[38vh]
          - Aside: absolute top-[38vh] left-0 right-0 bottom-0
          Both have EXPLICIT pixel bounds → iOS Safari can resolve
          overflow:hidden + overflow-y:scroll correctly.
          Desktop (md:): static flex-row — unchanged.
        */}
        <div className={`relative flex-1 ${selection ? "block" : "flex"} md:flex md:flex-row overflow-hidden`}>

          {/* Map */}
          <div className={
            selection
              /* mobile: explicit top slice */
              ? "absolute inset-x-0 top-0 h-[38vh] md:static md:h-full md:flex-1"
              /* no selection: fill everything */
              : "flex-1 md:flex-1"
          }>
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

          {/* Side panel
              Mobile : absolute, fills the bottom portion beneath the map.
                       Explicit pixel bounds → overflow-y:scroll works on iOS.
              Desktop: static flex child in the row, full height. */}
          {selection && (
            <aside className={[
              /* shared */
              "flex flex-col border-white/8 bg-black/80 backdrop-blur-sm",
              /* mobile: absolute below map */
              "absolute inset-x-0 bottom-0 top-[38vh] overflow-hidden border-t",
              /* desktop override: static sidebar */
              "md:static md:w-80 md:h-full md:flex-none md:border-t-0 md:border-l md:bg-black/60",
            ].join(" ")}>

              {/* City / Country header — never scrolls */}
              <div className="flex-shrink-0">
                {selection.type === "city" ? (
                  <CityOverlay
                    city={selection.city}
                    allCities={cities ?? []}
                    onSelectCity={handleSelectCity}
                    scopeFilter={scopeFilter}
                    onScopeChange={setScopeFilter}
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
              </div>

              {/* Spotlight — never scrolls, just takes its natural height */}
              {selectionStations.length > 0 && (
                <div className="flex-shrink-0">
                  <Spotlight
                    stations={selectionStations}
                    nowPlayingId={nowPlaying?.id ?? null}
                    onPlay={handleSelectStation}
                    maxCount={3}
                  />
                </div>
              )}

              {/* Station list — the ONE scrollable area.
                  overflow-y:scroll (not auto) forces scroll context on iOS.
                  flex-1 + min-h-0 ensures it collapses to remaining height. */}
              <div className="flex-1 min-h-0 overflow-y-scroll overscroll-contain">
                <StationList
                  countryCode={
                    selection.type === "city"
                      ? selection.city.countryCode
                      : selection.countryCode
                  }
                  city={cityName}
                  nowPlayingId={nowPlaying?.id ?? null}
                  onSelectStation={handleSelectStation}
                  isFavorited={isFavorited}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            </aside>
          )}
        </div>

        {/* ── Search palette ───────────────────────────────── */}
        <GlobalSearch
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectStation={handleSelectStation}
          onSelectCity={handleSelectCity}
          onSelectCountry={handleSelectCountry}
          onSelectGenre={handleSelectGenre}
        />
      </main>
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="flex h-full flex-col bg-black" />}>
      <ExploreContent />
    </Suspense>
  );
}
