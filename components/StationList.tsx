"use client";

import { useStations } from "@/lib/radio-api/hooks";
import { StationCard } from "./StationCard";
import { TECHNICAL_TEXT_CLASS } from "@/lib/format";
import type { Station } from "@/lib/radio-api/types";

interface StationListProps {
  countryCode: string | null;
  city?: string | null;
  nowPlayingId: string | null;
  onSelectStation: (station: Station) => void;
}

export function StationList({ countryCode, city, nowPlayingId, onSelectStation }: StationListProps) {
  const { data, isLoading, isError } = useStations(countryCode, city);

  if (!countryCode) {
    return null;
  }

  if (isLoading) {
    return (
      <div data-testid="station-list-skeleton" className="flex flex-col gap-2 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded bg-white/5" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div data-testid="station-list-error" className={`p-4 ${TECHNICAL_TEXT_CLASS}`}>
        Signal lost. Try again.
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div data-testid="station-list-empty" className={`p-4 ${TECHNICAL_TEXT_CLASS}`}>
        No stations found.
      </div>
    );
  }

  return (
    <div data-testid="station-list">
      {data.map((station) => (
        <StationCard
          key={station.id}
          station={station}
          isPlaying={station.id === nowPlayingId}
          onPlay={onSelectStation}
        />
      ))}
    </div>
  );
}
