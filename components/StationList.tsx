"use client";

import { useState } from "react";
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
  const [hqOnly, setHqOnly] = useState(false);
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

  const filteredStations = hqOnly
    ? data.filter((s) => (s.bitrate ?? 0) >= 128)
    : data;

  return (
    <div data-testid="station-list">
      {/* Subheader: count + HQ filter toggle */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
        <span className={TECHNICAL_TEXT_CLASS}>
          {filteredStations.length}{" "}
          {filteredStations.length === 1 ? "station" : "stations"}
        </span>
        <button
          type="button"
          data-testid="station-list-hq-toggle"
          onClick={() => setHqOnly((prev) => !prev)}
          className={`rounded border px-2 py-0.5 text-[10px] tracking-wider transition-colors ${
            hqOnly
              ? "border-white/40 bg-white/10 text-white"
              : "border-white/10 text-white/40 hover:text-white/70"
          }`}
        >
          HQ ONLY (≥128K)
        </button>
      </div>

      {filteredStations.length === 0 ? (
        <div data-testid="station-list-hq-empty" className={`p-4 ${TECHNICAL_TEXT_CLASS}`}>
          No HQ stations found (≥128 kbps).
        </div>
      ) : (
        filteredStations.map((station) => (
          <StationCard
            key={station.id}
            station={station}
            isPlaying={station.id === nowPlayingId}
            onPlay={onSelectStation}
            isFavorited={isFavorited?.(station)}
            onToggleFavorite={onToggleFavorite}
          />
        ))
      )}
    </div>
  );
}
