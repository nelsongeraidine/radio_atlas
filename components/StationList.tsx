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
  isFavorited?: (station: Station) => boolean;
  onToggleFavorite?: (station: Station) => void;
}

export function StationList({
  countryCode,
  city,
  nowPlayingId,
  onSelectStation,
  isFavorited,
  onToggleFavorite,
}: StationListProps) {
  const { data, isLoading, isError } = useStations(countryCode, city);

  if (!countryCode) {
    return null;
  }

  if (isLoading) {
    return (
      <div data-testid="station-list-skeleton" className="flex flex-col gap-2 p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded bg-white/5" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-2.5 w-3/4 animate-pulse rounded bg-white/5" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-white/5" />
            </div>
          </div>
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
          isFavorited={isFavorited?.(station)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
