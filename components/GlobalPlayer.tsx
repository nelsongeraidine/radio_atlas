"use client";

import { usePlayer } from "@/lib/player-context";
import { RadioPlayer } from "./RadioPlayer";

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
    <RadioPlayer
      station={nowPlaying}
      playlist={playlist}
      nowPlayingIndex={nowPlayingIndex}
      onNavigate={navigatePlaylist}
      isFavorited={nowPlaying ? isFavorited(nowPlaying) : false}
      onToggleFavorite={toggleFavorite}
    />
  );
}
