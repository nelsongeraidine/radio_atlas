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

// Same timeout used for Radio Browser API calls (lib/radio-api/client.ts), applied here to the
// audio stream connection itself: a dead stream host can accept the TCP connection and simply
// never send data, which triggers neither `error` nor a rejected `play()` promise.
const STREAM_CONNECT_TIMEOUT_MS = 8000;

export function RadioPlayer({ station }: RadioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [volume, setVolume] = useState(0.8);
  // A ref, not state: this is read from setTimeout callbacks scheduled by earlier renders
  // (the stream-connect timeout below), which would otherwise close over a stale `usingFallback`
  // value from whichever render happened to be current when the timer was armed. It isn't
  // rendered anywhere, so it doesn't need to trigger re-renders either.
  const usingFallbackRef = useRef(false);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearConnectTimeout() {
    if (connectTimeoutRef.current !== null) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    if (!station) return;
    tune(station.url, { isFallback: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station]);

  useEffect(() => {
    return () => clearConnectTimeout();
  }, []);

  function tune(url: string, options?: { isFallback: boolean }) {
    const audio = audioRef.current;
    if (!audio) return;
    if (options) {
      usingFallbackRef.current = options.isFallback;
    }
    clearConnectTimeout();
    setStatus("tuning");
    audio.src = url;
    audio.volume = volume;
    audio.play()?.catch(() => {
      clearConnectTimeout();
      handleError();
    });
    connectTimeoutRef.current = setTimeout(() => {
      connectTimeoutRef.current = null;
      handleError();
    }, STREAM_CONNECT_TIMEOUT_MS);
  }

  function handleError() {
    clearConnectTimeout();
    if (station?.fallbackUrl && !usingFallbackRef.current) {
      tune(station.fallbackUrl, { isFallback: true });
      return;
    }
    setStatus("signal_lost");
  }

  function handleCanPlay() {
    clearConnectTimeout();
    setStatus("tuned_in");
  }

  function handleWaiting() {
    setStatus("tuning");
    // A stream that starts playing and then stalls mid-stream (buffer underrun with no more
    // data coming) fires `waiting` but never `error`/`canplay` again — arm the same recovery
    // timeout so it doesn't hang silently forever.
    clearConnectTimeout();
    connectTimeoutRef.current = setTimeout(() => {
      connectTimeoutRef.current = null;
      handleError();
    }, STREAM_CONNECT_TIMEOUT_MS);
  }

  function handleTryAgain() {
    if (!station) return;
    tune(usingFallbackRef.current && station.fallbackUrl ? station.fallbackUrl : station.url);
  }

  function togglePlayPause() {
    const audio = audioRef.current;
    if (!audio || !station) return;
    if (status === "tuned_in") {
      audio.pause();
      setStatus("idle");
    } else if (status === "idle") {
      tune(usingFallbackRef.current && station.fallbackUrl ? station.fallbackUrl : station.url);
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
      className="flex items-center justify-between gap-4 border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur"
    >
      <audio ref={audioRef} onError={handleError} onCanPlay={handleCanPlay} onWaiting={handleWaiting} />
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
