"use client";

import type { Station } from "@/lib/radio-api/types";
import { useStations } from "@/lib/radio-api/hooks";
import { TECHNICAL_TEXT_CLASS, formatBitrate } from "@/lib/format";
import { Play } from "lucide-react";
import { Heart } from "lucide-react";

interface DiscoverSectionProps {
  id?: string;
  label: string;
  countryCode: string;
  nowPlayingId: string | null;
  onPlay: (station: Station) => void;
  isFavorited: (station: Station) => boolean;
  onToggleFavorite: (station: Station) => void;
  isHighlighted?: boolean;
}

export function DiscoverSection({
  id,
  label,
  countryCode,
  nowPlayingId,
  onPlay,
  isFavorited,
  onToggleFavorite,
  isHighlighted = false,
}: DiscoverSectionProps) {
  const { data, isLoading, isError } = useStations(countryCode, null);

  return (
    <div
      id={id}
      data-testid={id ? `discover-section-${id}` : undefined}
      className={`rounded-xl transition-all duration-700 p-2 -m-2 ${
        isHighlighted
          ? "bg-white/5 ring-1 ring-white/30 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <h2 className={`text-xs font-semibold uppercase tracking-widest ${isHighlighted ? "text-white" : "text-white/50"}`}>
          {label}
        </h2>
        {isHighlighted && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-white">
            MATCH
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 w-44 flex-shrink-0 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      )}

      {isError && (
        <p className={`${TECHNICAL_TEXT_CLASS}`}>Signal lost.</p>
      )}

      {data && data.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {data.slice(0, 20).map((station) => {
            const isPlaying = station.id === nowPlayingId;
            return (
              <div
                key={station.id}
                className={`group relative flex-shrink-0 w-44 overflow-hidden rounded-lg border transition-colors duration-200 ${
                  isPlaying ? "border-white/20 bg-white/8" : "border-white/8 bg-white/5 hover:border-white/15 hover:bg-white/8"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onPlay(station)}
                  className="flex w-full flex-col gap-2 p-3 text-left"
                >
                  {/* Logo */}
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-white/5">
                    {station.favicon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={station.favicon}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-[9px] font-bold uppercase text-white/20">
                        {station.name.slice(0, 2)}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="truncate text-xs font-medium text-white">{station.name}</p>
                    <p className={`truncate ${TECHNICAL_TEXT_CLASS}`}>
                      {isPlaying && <span className="text-signal-green">LIVE · </span>}
                      {station.tags[0]?.toUpperCase() ?? station.country}
                      {station.bitrate ? ` · ${formatBitrate(station.bitrate)}` : ""}
                    </p>
                  </div>
                </button>

                {/* Controls row */}
                <div className="flex items-center justify-between px-3 pb-2.5">
                  <Play
                    size={11}
                    className={`transition-opacity ${isPlaying ? "opacity-0" : "text-white/30 group-hover:text-white/60"}`}
                  />
                  <button
                    type="button"
                    aria-label={isFavorited(station) ? "Remove from favorites" : "Add to favorites"}
                    onClick={() => onToggleFavorite(station)}
                    className={`rounded p-0.5 opacity-0 transition-all duration-150 group-hover:opacity-100 ${
                      isFavorited(station)
                        ? "!opacity-100 text-ember-red"
                        : "text-white/30 hover:text-white/70"
                    }`}
                  >
                    <Heart size={11} className={isFavorited(station) ? "fill-current" : ""} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
