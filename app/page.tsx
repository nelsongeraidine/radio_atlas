"use client";

import { useState } from "react";
import { WorldMap } from "@/components/WorldMap";
import { CityOverlay } from "@/components/CityOverlay";
import { StationList } from "@/components/StationList";
import { RadioPlayer } from "@/components/RadioPlayer";
import { useCityMarkers } from "@/lib/radio-api/hooks";
import type { CityMarker, Station } from "@/lib/radio-api/types";

export default function ExplorePage() {
  const { data: cities } = useCityMarkers();
  const [selectedCity, setSelectedCity] = useState<CityMarker | null>(null);
  const [nowPlaying, setNowPlaying] = useState<Station | null>(null);

  return (
    <main className="flex h-screen flex-col bg-black">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <span className="text-sm uppercase tracking-widest text-white">Radio Atlas</span>
      </header>
      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1">
          <WorldMap cities={cities ?? []} onSelectCity={setSelectedCity} />
        </div>
        {selectedCity ? (
          <aside className="w-80 overflow-y-auto border-l border-white/10">
            <CityOverlay city={selectedCity} />
            <StationList
              countryCode={selectedCity.countryCode}
              city={selectedCity.city}
              nowPlayingId={nowPlaying?.id ?? null}
              onSelectStation={setNowPlaying}
            />
          </aside>
        ) : null}
      </div>
      <RadioPlayer station={nowPlaying} />
    </main>
  );
}
