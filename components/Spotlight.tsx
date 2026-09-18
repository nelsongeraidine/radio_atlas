"use client";

import { Play } from "lucide-react";
import type { Station } from "@/lib/radio-api/types";
import { TECHNICAL_TEXT_CLASS, formatBitrate } from "@/lib/format";

interface SpotlightProps {
  stations: Station[];
  nowPlayingId: string | null;
  onPlay: (station: Station) => void;
  maxCount?: number;
}

const SPOTLIGHT_COUNT = 5;

export function Spotlight({ stations, nowPlayingId, onPlay, maxCount = SPOTLIGHT_COUNT }: SpotlightProps) {
  const featured = stations.slice(0, maxCount);
  if (featured.length === 0) return null;

  return (
    <div className="border-b border-white/8 px-3.5 sm:px-4 pb-3 sm:pb-4 pt-2">
      <div className="flex items-center justify-between mb-2">
        <span className={TECHNICAL_TEXT_CLASS}>Spotlight</span>
        <span className="text-[10px] text-white/30 sm:hidden">Swipe ⇄</span>
      </div>
      <div className="flex flex-row overflow-x-auto gap-2 md:flex-col pb-1 md:pb-0 overscroll-contain">
        {featured.map((station) => {
          const isPlaying = station.id === nowPlayingId;
          return (
            <button
              key={station.id}
              type="button"
              data-testid="spotlight-station"
              onClick={() => onPlay(station)}
              className={`flex flex-shrink-0 w-48 md:w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 border border-white/5 md:border-transparent ${
                isPlaying ? "bg-white/10 border-white/20" : "bg-transparent hover:bg-white/5"
              }`}
            >
              {/* Logo */}
              <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded bg-white/5">
                {station.favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={station.favicon}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[9px] font-semibold uppercase text-white/30">
                    {station.name.slice(0, 2)}
                  </span>
                )}
                {isPlaying && (
                  <span className="live-dot absolute bottom-0.5 right-0.5 h-1 w-1 rounded-full bg-signal-green" />
                )}
              </div>

              {/* Name + meta */}
              <div className="min-w-0 flex-1">
                <span className={`block truncate text-xs font-medium ${isPlaying ? "text-white" : "text-white/80"}`}>
                  {station.name}
                </span>
                <span className={`block truncate ${TECHNICAL_TEXT_CLASS}`}>
                  {station.tags[0]?.toUpperCase() ?? station.country}
                  {station.bitrate ? ` · ${formatBitrate(station.bitrate)}` : ""}
                </span>
              </div>

              {/* Play icon */}
              {!isPlaying && (
                <Play size={11} className="flex-shrink-0 text-white/30" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
