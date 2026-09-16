"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { WorldMap } from "@/components/WorldMap";
import { CityOverlay } from "@/components/CityOverlay";
import { StationList } from "@/components/StationList";
import { RadioPlayer } from "@/components/RadioPlayer";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useCityMarkers } from "@/lib/radio-api/hooks";
import { TECHNICAL_TEXT_CLASS } from "@/lib/format";
import type { CityMarker, Country, Station } from "@/lib/radio-api/types";

type Selection =
  | { type: "city"; city: CityMarker }
  | { type: "country"; countryCode: string; countryName: string };

export default function ExplorePage() {
  const { data: cities, isLoading, isError } = useCityMarkers();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [nowPlaying, setNowPlaying] = useState<Station | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  function handleSelectCountry(country: Country) {
    setSelection({ type: "country", countryCode: country.countryCode, countryName: country.name });
  }

  return (
    <main className="flex h-screen flex-col bg-black">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <span className="text-sm uppercase tracking-widest text-white">Radio Atlas</span>
        <button
          type="button"
          data-testid="open-search"
          onClick={() => setIsSearchOpen(true)}
          className={`flex items-center gap-2 rounded border border-white/10 px-3 py-1.5 ${TECHNICAL_TEXT_CLASS}`}
        >
          <Search className="h-3.5 w-3.5" />
          Search
          <span className="text-white/30">⌘K</span>
        </button>
      </header>
      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1">
          <WorldMap cities={cities ?? []} onSelectCity={(city) => setSelection({ type: "city", city })} />
        </div>
        {isLoading ? (
          <div
            data-testid="city-markers-loading"
            className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded bg-black/70 px-3 py-1 ${TECHNICAL_TEXT_CLASS}`}
          >
            Resolving stations…
          </div>
        ) : null}
        {isError ? (
          <div
            data-testid="city-markers-error"
            className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded bg-black/70 px-3 py-1 ${TECHNICAL_TEXT_CLASS}`}
          >
            Signal lost. Try again.
          </div>
        ) : null}
        {selection ? (
          <aside className="w-80 overflow-y-auto border-l border-white/10">
            {selection.type === "city" ? (
              <CityOverlay city={selection.city} />
            ) : (
              <div className="flex flex-col gap-1 p-6">
                <h2 className="text-4xl text-white">{selection.countryName}</h2>
              </div>
            )}
            <StationList
              countryCode={selection.type === "city" ? selection.city.countryCode : selection.countryCode}
              city={selection.type === "city" ? selection.city.city : undefined}
              nowPlayingId={nowPlaying?.id ?? null}
              onSelectStation={setNowPlaying}
            />
          </aside>
        ) : null}
      </div>
      <RadioPlayer station={nowPlaying} />
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStation={setNowPlaying}
        onSelectCity={(city) => setSelection({ type: "city", city })}
        onSelectCountry={handleSelectCountry}
      />
    </main>
  );
}
