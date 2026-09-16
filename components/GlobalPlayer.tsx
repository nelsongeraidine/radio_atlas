"use client";

import { usePlayer } from "@/lib/player-context";
import { RadioPlayer } from "./RadioPlayer";

function InstagramIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkedInIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function GlobalPlayer() {
  const {
    nowPlaying,
    playlist,
    nowPlayingIndex,
    navigatePlaylist,
    isFavorited,
    toggleFavorite,
  } = usePlayer();

  return (
    <div className="flex flex-col">
      <RadioPlayer
        station={nowPlaying}
        playlist={playlist}
        nowPlayingIndex={nowPlayingIndex}
        onNavigate={navigatePlaylist}
        isFavorited={nowPlaying ? isFavorited(nowPlaying) : false}
        onToggleFavorite={toggleFavorite}
      />

      {/* Attribution footer */}
      <footer
        data-testid="author-attribution"
        className="flex items-center justify-between border-t border-white/[0.06] bg-black/95 px-3 sm:px-5 py-1 text-[11px] text-white/40 backdrop-blur-md"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-white/30">feito por</span>
          <a
            href="https://instagram.com/nelsonggeraidine"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 text-white/60 transition-colors hover:text-white"
          >
            <InstagramIcon className="h-3 w-3 text-white/50 transition-transform group-hover:scale-110 group-hover:text-white" />
            <span className="font-medium tracking-tight">@nelsonggeraidine</span>
          </a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://linkedin.com/in/nelsonggeraidine"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn de Nelson Geraidine"
            className="group inline-flex items-center gap-1 text-white/40 transition-colors hover:text-white/80"
          >
            <LinkedInIcon className="h-3 w-3 text-white/40 transition-transform group-hover:scale-110 group-hover:text-white" />
            <span className="hidden sm:inline font-medium">LinkedIn</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
