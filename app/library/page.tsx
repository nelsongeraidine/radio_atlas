"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlobalSearch } from "@/components/GlobalSearch";
import { StationCard } from "@/components/StationCard";
import { useFavorites, useRecentlyPlayed, useCitiesVisited } from "@/lib/library";
import { usePlayer } from "@/lib/player-context";
import { TECHNICAL_TEXT_CLASS, formatCityCountry, formatStationCount } from "@/lib/format";
import type { CityMarker, Country, Station } from "@/lib/radio-api/types";

type Tab = "favorites" | "recent" | "cities";

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("favorites");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { nowPlaying, playStation, isFavorited, toggleFavorite } = usePlayer();
  const { favorites } = useFavorites();
  const { recentlyPlayed } = useRecentlyPlayed();
  const { citiesVisited } = useCitiesVisited();
  const router = useRouter();

  function handleSelectStation(station: Station) {
    playStation(station);
  }

  function handleSelectCity(city: CityMarker) {
    router.push(`/?city=${encodeURIComponent(city.city)}&cc=${encodeURIComponent(city.countryCode)}`);
  }

  function handleSelectCountry(country: Country) {
    router.push(`/?cc=${encodeURIComponent(country.countryCode)}`);
  }

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "favorites", label: "Favorites", count: favorites.length },
    { id: "recent", label: "Recently played", count: recentlyPlayed.length },
    { id: "cities", label: "Cities visited", count: citiesVisited.length },
  ];

  return (
    <main className="flex h-full flex-col bg-black">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/8 px-6 py-3">
        <div className="flex items-center gap-8">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
            Radio Atlas
          </span>
          <nav className="flex items-center gap-6">
            <Link href="/" className={`${TECHNICAL_TEXT_CLASS} transition-colors hover:text-white/80`}>
              Explore
            </Link>
            <Link href="/discover" className={`${TECHNICAL_TEXT_CLASS} transition-colors hover:text-white/80`}>
              Discover
            </Link>
            <span className={`${TECHNICAL_TEXT_CLASS} border-b border-white pb-0.5 text-white`}>
              Library
            </span>
          </nav>
        </div>
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
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-8">
        <h1 className="mb-6 text-3xl font-light tracking-tight text-white">Library.</h1>

        {/* Tabs */}
        <div className="mb-8 flex items-center gap-6 border-b border-white/8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-xs uppercase tracking-wide transition-colors ${
                activeTab === tab.id
                  ? "border-b border-white text-white font-medium"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-white/20">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "favorites" && (
            favorites.length === 0 ? (
              <EmptyState message="No favorite stations yet." hint="Heart stations while listening to save them here." />
            ) : (
              <div className="flex flex-col">
                {favorites.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    isPlaying={nowPlaying?.id === station.id}
                    onPlay={handleSelectStation}
                    isFavorited={true}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === "recent" && (
            recentlyPlayed.length === 0 ? (
              <EmptyState message="No recently played stations." hint="Stations you listen to will appear here automatically." />
            ) : (
              <div className="flex flex-col">
                {recentlyPlayed.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    isPlaying={nowPlaying?.id === station.id}
                    onPlay={handleSelectStation}
                    isFavorited={isFavorited(station)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === "cities" && (
            citiesVisited.length === 0 ? (
              <EmptyState message="No cities visited yet." hint="Click cities on the map or find them via search." />
            ) : (
              <div>
                {citiesVisited.map((city) => (
                  <button
                    key={`${city.countryCode}-${city.city}`}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    className="flex w-full items-center justify-between border-b border-white/5 px-6 py-4 text-left transition-colors hover:bg-white/5"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{city.city}.</p>
                      <p className={TECHNICAL_TEXT_CLASS}>{formatCityCountry(city.city, city.countryName)}</p>
                    </div>
                    <p className={TECHNICAL_TEXT_CLASS}>{formatStationCount(city.stationCount)}</p>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStation={handleSelectStation}
        onSelectCity={handleSelectCity}
        onSelectCountry={handleSelectCountry}
      />
    </main>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <p className="text-sm text-white/40">{message}</p>
      <p className={TECHNICAL_TEXT_CLASS}>{hint}</p>
    </div>
  );
}
