"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Keyboard,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Station } from "@/lib/radio-api/types";
import { TECHNICAL_TEXT_CLASS, formatBitrate, formatCityCountry } from "@/lib/format";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";
import { AudioVisualizer } from "./AudioVisualizer";

type PlayerStatus = "idle" | "tuning" | "tuned_in" | "signal_lost";

interface RadioPlayerProps {
  station: Station | null;
  playlist?: Station[];
  nowPlayingIndex?: number;
  onNavigate?: (direction: "prev" | "next") => void;
  isFavorited?: boolean;
  onToggleFavorite?: (station: Station) => void;
}

// Same timeout used for Radio Browser API calls (lib/radio-api/client.ts), applied here to the
// audio stream connection itself: a dead stream host can accept the TCP connection and simply
// never send data, which triggers neither `error` nor a rejected `play()` promise.
const STREAM_CONNECT_TIMEOUT_MS = 8000;

export function RadioPlayer({
  station,
  playlist = [],
  nowPlayingIndex = -1,
  onNavigate,
  isFavorited = false,
  onToggleFavorite,
}: RadioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  // A ref, not state: this is read from setTimeout callbacks scheduled by earlier renders
  // (the stream-connect timeout below), which would otherwise close over a stale `usingFallback`
  // value from whichever render happened to be current when the timer was armed. It isn't
  // rendered anywhere, so it doesn't need to trigger re-renders either.
  const usingFallbackRef = useRef(false);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleShare() {
    if (!station || typeof window === "undefined") return;
    const url = new URL(window.location.origin);
    url.pathname = "/";
    if (station.state) url.searchParams.set("city", station.state);
    url.searchParams.set("cc", station.countryCode);
    url.searchParams.set("station", station.id);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString());
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

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
    audio.volume = muted ? 0 : volume;
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
    setMuted(next === 0);
    if (audioRef.current) {
      audioRef.current.volume = next;
    }
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    setMuted(next);
    audio.volume = next ? 0 : volume;
  }

  const hasPrev = playlist.length > 0 && nowPlayingIndex > 0;
  const hasNext = playlist.length > 0 && nowPlayingIndex < playlist.length - 1;

  // MediaSession API metadata & playbackState sync
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    if (!station) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return;
    }

    const artwork = station.favicon
      ? [{ src: station.favicon, sizes: "96x96" }]
      : [];

    if (typeof MediaMetadata !== "undefined") {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: station.name,
          artist: station.countryCode
            ? formatCityCountry(station.countryCode, station.country)
            : station.country,
          album: "Radio Atlas",
          artwork,
        });
      } catch {
        // In case MediaMetadata throws
      }
    }

    navigator.mediaSession.playbackState =
      status === "tuned_in" ? "playing" : status === "idle" ? "paused" : "none";
  }, [station, status]);

  // MediaSession action handlers
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler("play", () => {
        togglePlayPause();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        togglePlayPause();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        onNavigate?.("prev");
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        onNavigate?.("next");
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          setStatus("idle");
        }
      });
    } catch {
      // Browsers may throw on unsupported action handlers
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("stop", null);
      } catch {
        // ignore
      }
    };
  });

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    disabled: !station,
    onTogglePlayPause: togglePlayPause,
    onToggleMute: toggleMute,
    onPrev: hasPrev ? () => onNavigate?.("prev") : undefined,
    onNext: hasNext ? () => onNavigate?.("next") : undefined,
    onToggleFavorite: onToggleFavorite ? () => onToggleFavorite(station!) : undefined,
    onToggleHelp: () => setShowShortcutsHelp((prev) => !prev),
  });

  return (
    <>
      {/* Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div
          role="dialog"
          aria-label="Keyboard shortcuts"
          data-testid="shortcuts-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowShortcutsHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-white/10 bg-black/95 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className={`text-xs uppercase tracking-widest text-white/70 ${TECHNICAL_TEXT_CLASS}`}>
                Keyboard Shortcuts
              </h3>
              <button
                type="button"
                onClick={() => setShowShortcutsHelp(false)}
                className="rounded p-1 text-white/40 hover:text-white"
                aria-label="Close shortcuts"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-xs text-white/80">
              <div className="flex items-center justify-between">
                <span>Play / Pause</span>
                <kbd className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white">Space</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Mute / Unmute</span>
                <kbd className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white">M</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Previous station</span>
                <kbd className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white">← or J</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Next station</span>
                <kbd className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white">→ or K</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Favorite station</span>
                <kbd className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white">L or F</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Toggle shortcuts guide</span>
                <kbd className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white">?</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini player bar when collapsed on mobile */}
      {station && isCollapsed && (
        <div
          data-testid="radio-player-collapsed"
          className="flex sm:hidden items-center justify-between border-t border-white/8 bg-black/95 px-3 py-2 backdrop-blur-md"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="live-dot h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
            <p className="truncate text-xs font-medium text-white">{station.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="collapsed-play-toggle"
              onClick={togglePlayPause}
              aria-label={status === "tuned_in" ? "Pause" : "Play"}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black"
            >
              {status === "tuned_in" ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              type="button"
              data-testid="expand-player-btn"
              onClick={() => setIsCollapsed(false)}
              aria-label="Expand player"
              className="rounded p-1 text-white/50 hover:text-white"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
      )}

      <div
        data-testid="radio-player"
        className={`${isCollapsed ? "hidden sm:flex" : "flex"} items-center gap-2 sm:gap-4 border-t border-white/8 bg-black/90 px-3 sm:px-5 py-2 sm:py-3 backdrop-blur-md transition-all duration-300`}
      >
        <audio
          ref={audioRef}
          onError={handleError}
          onCanPlay={handleCanPlay}
          onWaiting={handleWaiting}
        />
        {station ? (
          <>
            {/* Mobile collapse button */}
            <button
              type="button"
              data-testid="collapse-player-btn"
              onClick={() => setIsCollapsed(true)}
              aria-label="Collapse player"
              className="sm:hidden flex-shrink-0 rounded p-1 text-white/40 hover:text-white"
            >
              <ChevronDown size={16} />
            </button>

            {/* Station logo */}
            <div className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 overflow-hidden rounded bg-white/5">
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
                <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase text-white/30">
                  {station.name.slice(0, 2)}
                </div>
              )}
            </div>

            {/* Station info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs sm:text-sm font-medium text-white">{station.name}</p>
              <p className={`${TECHNICAL_TEXT_CLASS} truncate`}>
                {station.countryCode
                  ? formatCityCountry(station.countryCode, station.country)
                  : station.country}
                {station.bitrate ? ` · ${formatBitrate(station.bitrate)}` : ""}
              </p>
            </div>

            {/* Status + visualizer */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                data-testid="player-status"
                className={`${TECHNICAL_TEXT_CLASS} whitespace-nowrap`}
              >
                {status === "tuning" && (
                  <span className="animate-pulse">TUNING…</span>
                )}
                {status === "tuned_in" && (
                  <span className="flex items-center gap-1.5">
                    <span className="live-dot h-1.5 w-1.5 rounded-full bg-green-400" />
                    LIVE
                  </span>
                )}
                {status === "signal_lost" && "SIGNAL LOST"}
                {status === "idle" && "PAUSED"}
              </span>
              <AudioVisualizer active={status === "tuned_in"} />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Prev */}
              <button
                type="button"
                onClick={() => onNavigate?.("prev")}
                disabled={!hasPrev}
                aria-label="Previous station"
                className="rounded p-1.5 text-white/50 transition-colors hover:text-white disabled:opacity-20"
              >
                <SkipBack size={16} />
              </button>

              {/* Play/Pause or Try Again */}
              {status === "signal_lost" ? (
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className={`rounded border border-white/20 px-2.5 py-1 ${TECHNICAL_TEXT_CLASS} hover:bg-white/10`}
                >
                  Try again
                </button>
              ) : (
                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={status === "tuned_in" ? "Pause" : "Play"}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95"
                >
                  {status === "tuned_in" ? <Pause size={14} /> : <Play size={14} />}
                </button>
              )}

              {/* Next */}
              <button
                type="button"
                onClick={() => onNavigate?.("next")}
                disabled={!hasNext}
                aria-label="Next station"
                className="rounded p-1.5 text-white/50 transition-colors hover:text-white disabled:opacity-20"
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
                className="text-white/40 transition-colors hover:text-white/70"
              >
                {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume"
                className="volume-slider hidden w-20 sm:block"
              />
            </div>

            {/* Favorite */}
            {onToggleFavorite && (
              <button
                type="button"
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                onClick={() => onToggleFavorite(station)}
                className={`rounded p-1.5 transition-colors duration-200 ${
                  isFavorited
                    ? "text-red-400 hover:text-red-300"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                <Heart size={15} className={isFavorited ? "fill-current" : ""} />
              </button>
            )}

            {/* Share */}
            <div className="relative">
              <button
                type="button"
                aria-label="Share station"
                onClick={handleShare}
                className="rounded p-1.5 text-white/30 transition-colors hover:text-white/60"
              >
                <Share2 size={15} />
              </button>
              {copied && (
                <span
                  data-testid="copied-toast"
                  className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-white px-2 py-0.5 text-[10px] font-medium text-black shadow animate-fade-in"
                >
                  Link copied!
                </span>
              )}
            </div>

            {/* Keyboard shortcuts trigger */}
            <button
              type="button"
              aria-label="Keyboard shortcuts"
              data-testid="shortcuts-btn"
              onClick={() => setShowShortcutsHelp((prev) => !prev)}
              className="hidden sm:inline-flex rounded p-1.5 text-white/30 transition-colors hover:text-white/60"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard size={15} />
            </button>
          </>
        ) : (
          <span className={TECHNICAL_TEXT_CLASS}>No station selected</span>
        )}
      </div>
    </>
  );
}
