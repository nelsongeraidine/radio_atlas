"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import type { Station } from "@/lib/radio-api/types";
import { TECHNICAL_TEXT_CLASS, formatBitrate } from "@/lib/format";
import { AudioVisualizer } from "./AudioVisualizer";

type PlayerStatus = "idle" | "tuning" | "tuned_in" | "signal_lost";

interface RadioPlayerProps {
  station: Station | null;
}

export function RadioPlayer({ station }: RadioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [volume, setVolume] = useState(0.8);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    if (!station) {
      setStatus("idle");
      return;
    }
    setUsingFallback(false);
    tune(station.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station]);

  function tune(url: string) {
    const audio = audioRef.current;
    if (!audio) return;
    setStatus("tuning");
    audio.src = url;
    audio.volume = volume;
    audio.play()?.catch(() => setStatus("signal_lost"));
  }

  function handleError() {
    if (station?.fallbackUrl && !usingFallback) {
      setUsingFallback(true);
      tune(station.fallbackUrl);
      return;
    }
    setStatus("signal_lost");
  }

  function handleCanPlay() {
    setStatus("tuned_in");
  }

  function handleTryAgain() {
    if (!station) return;
    tune(usingFallback && station.fallbackUrl ? station.fallbackUrl : station.url);
  }

  function togglePlayPause() {
    const audio = audioRef.current;
    if (!audio || !station) return;
    if (status === "tuned_in") {
      audio.pause();
      setStatus("idle");
    } else if (status === "idle") {
      tune(usingFallback && station.fallbackUrl ? station.fallbackUrl : station.url);
    }
  }

  function handleVolumeChange(e: ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value);
    setVolume(next);
    if (audioRef.current) {
      audioRef.current.volume = next;
    }
  }

  return (
    <div
      data-testid="radio-player"
      className="fixed inset-x-0 bottom-0 flex items-center justify-between gap-4 border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur"
    >
      <audio ref={audioRef} onError={handleError} onCanPlay={handleCanPlay} onWaiting={() => setStatus("tuning")} />
      {station ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-white">{station.name}</span>
            <span data-testid="player-status" className={TECHNICAL_TEXT_CLASS}>
              {status === "tuning" && "TUNING…"}
              {status === "tuned_in" && "TUNED IN"}
              {status === "signal_lost" && "SIGNAL LOST"}
              {status === "idle" && "PAUSED"}
              {station.bitrate ? ` · ${formatBitrate(station.bitrate)}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {status === "signal_lost" ? (
              <button type="button" onClick={handleTryAgain} className={TECHNICAL_TEXT_CLASS}>
                Try again
              </button>
            ) : (
              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={status === "tuned_in" ? "Pause" : "Play"}
              >
                {status === "tuned_in" ? <Pause size={18} /> : <Play size={18} />}
              </button>
            )}
            <Volume2 size={16} className="text-white/50" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
            />
            <AudioVisualizer active={status === "tuned_in"} />
          </div>
        </>
      ) : (
        <span className={TECHNICAL_TEXT_CLASS}>No station selected</span>
      )}
    </div>
  );
}
