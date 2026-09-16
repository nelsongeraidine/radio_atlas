import type { Station } from "@/lib/radio-api/types";
import { TECHNICAL_TEXT_CLASS, formatBitrate } from "@/lib/format";

interface StationCardProps {
  station: Station;
  isPlaying: boolean;
  onPlay: (station: Station) => void;
}

export function StationCard({ station, isPlaying, onPlay }: StationCardProps) {
  return (
    <button
      type="button"
      onClick={() => onPlay(station)}
      aria-pressed={isPlaying}
      data-testid="station-card"
      className="flex w-full items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-left transition hover:bg-white/5"
    >
      <div className="flex flex-col gap-1">
        <span className="text-base text-white">{station.name}</span>
        <span className={TECHNICAL_TEXT_CLASS}>
          {station.country}
          {station.language ? ` · ${station.language}` : ""}
          {station.tags.length > 0 ? ` · ${station.tags[0]}` : ""}
        </span>
      </div>
      {station.bitrate ? <span className={TECHNICAL_TEXT_CLASS}>{formatBitrate(station.bitrate)}</span> : null}
    </button>
  );
}
