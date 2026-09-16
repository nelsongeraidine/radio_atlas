"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlobalSearch } from "@/components/GlobalSearch";
import { DiscoverSection } from "@/components/DiscoverSection";
import { usePlayer } from "@/lib/player-context";
import { TECHNICAL_TEXT_CLASS } from "@/lib/format";
import type { CityMarker, Country, Station } from "@/lib/radio-api/types";

// Editorial sections: each maps to a country code or a tag search
// Country codes come directly from Radio Browser API; tags map to genre searches
const SECTIONS = [
  { label: "Around the world", type: "countries" as const, values: ["US", "GB", "FR", "DE", "JP", "BR", "IN", "AU"] },
  { label: "Brazil", type: "country" as const, countryCode: "BR" },
  { label: "Electronic", type: "country" as const, countryCode: "DE" },
  { label: "Jazz", type: "country" as const, countryCode: "US" },
  { label: "Europe", type: "countries" as const, values: ["FR", "ES", "IT", "NL", "PL", "SE"] },
  { label: "Late night", type: "country" as const, countryCode: "GB" },
  { label: "Asia", type: "countries" as const, values: ["JP", "KR", "CN", "IN", "TH", "ID"] },
  { label: "News & Talk", type: "country" as const, countryCode: "US" },
  { label: "Something different", type: "country" as const, countryCode: "NZ" },
] as const;

export default function DiscoverPage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { nowPlaying, playStation, isFavorited, toggleFavorite } = usePlayer();
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

  function handleSelectGenre(genre: string) {
    const el = document.getElementById(genre.toLowerCase());
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

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
            <span className={`${TECHNICAL_TEXT_CLASS} border-b border-white pb-0.5 text-white`}>
              Discover
            </span>
            <Link href="/library" className={`${TECHNICAL_TEXT_CLASS} transition-colors hover:text-white/80`}>
              Library
            </Link>
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
        <h1 className="mb-8 text-3xl font-light tracking-tight text-white">Discover.</h1>

        <div className="flex flex-col gap-10">
          {SECTIONS.map((section) => (
            <DiscoverSection
              key={section.label}
              label={section.label}
              countryCode={section.type === "country" ? section.countryCode : section.values[0]}
              nowPlayingId={nowPlaying?.id ?? null}
              onPlay={handleSelectStation}
              isFavorited={isFavorited}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </div>

      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStation={handleSelectStation}
        onSelectCity={handleSelectCity}
        onSelectCountry={handleSelectCountry}
        onSelectGenre={handleSelectGenre}
      />
    </main>
  );
}
