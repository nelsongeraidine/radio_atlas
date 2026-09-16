"use client";

import { Heart } from "lucide-react";
import type { Station } from "@/lib/radio-api/types";
import { TECHNICAL_TEXT_CLASS, formatBitrate } from "@/lib/format";

interface StationCardProps {
  station: Station;
  isPlaying: boolean;
  onPlay: (station: Station) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (station: Station) => void;
}

export function StationCard({
  station,
  isPlaying,
  onPlay,
  isFavorited = false,
  onToggleFavorite,
}: StationCardProps) {
  return (
    <div
      data-testid="station-card"
      className={`group flex items-center gap-3 border-b border-white/5 px-4 py-3 transition-colors duration-200 ${
        isPlaying ? "bg-white/8" : "hover:bg-white/5"
      }`}
    >
      {/* Logo / Favicon */}
      <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-white/5">
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
          <span className="text-[10px] font-semibold uppercase text-white/30">
            {station.name.slice(0, 2)}
          </span>
        )}
        {/* LIVE dot overlay when playing */}
        {isPlaying && (
          <span className="live-dot absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-green-400" />
        )}
      </div>

      {/* Main info — clickable area */}
      <button
        type="button"
        onClick={() => onPlay(station)}
        aria-pressed={isPlaying}
        className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
      >
        <span
          className={`truncate text-sm font-medium leading-tight ${
            isPlaying ? "text-white" : "text-white/90"
          }`}
        >
          {station.name}
        </span>
        <span className={`${TECHNICAL_TEXT_CLASS} truncate`}>
          {isPlaying && <span className="mr-1.5 text-green-400">LIVE</span>}
          {station.country}
          {station.language ? ` · ${station.language.toUpperCase()}` : ""}
          {station.tags[0] ? ` · ${station.tags[0].toUpperCase()}` : ""}
          {station.bitrate ? ` · ${formatBitrate(station.bitrate)}` : ""}
        </span>
      </button>

      {/* Favorite button */}
      {onToggleFavorite && (
        <button
          type="button"
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(station);
          }}
          className={`flex-shrink-0 rounded p-1 opacity-0 transition-all duration-200 group-hover:opacity-100 ${
            isFavorited
              ? "!opacity-100 text-red-400 hover:text-red-300"
              : "text-white/30 hover:text-white/70"
          }`}
        >
          <Heart
            size={14}
            className={isFavorited ? "fill-current" : ""}
          />
        </button>
      )}
    </div>
  );
}
