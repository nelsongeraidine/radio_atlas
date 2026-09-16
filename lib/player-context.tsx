"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Station } from "./radio-api/types";
import { useFavorites, useRecentlyPlayed } from "./library";

export interface PlayerContextType {
  nowPlaying: Station | null;
  playlist: Station[];
  nowPlayingIndex: number;
  playStation: (station: Station, newPlaylist?: Station[]) => void;
  setPlaylist: (playlist: Station[]) => void;
  navigatePlaylist: (direction: "prev" | "next") => void;
  isFavorited: (station: Station) => boolean;
  toggleFavorite: (station: Station) => void;
}

const defaultPlayerContext: PlayerContextType = {
  nowPlaying: null,
  playlist: [],
  nowPlayingIndex: -1,
  playStation: () => {},
  setPlaylist: () => {},
  navigatePlaylist: () => {},
  isFavorited: () => false,
  toggleFavorite: () => {},
};

export const PlayerContext = createContext<PlayerContextType>(defaultPlayerContext);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<Station | null>(null);
  const [playlist, setPlaylistState] = useState<Station[]>([]);
  const [nowPlayingIndex, setNowPlayingIndex] = useState(-1);

  const { isFavorited, toggleFavorite } = useFavorites();
  const { addToHistory } = useRecentlyPlayed();

  const playStation = useCallback(
    (station: Station, newPlaylist?: Station[]) => {
      setNowPlaying(station);
      addToHistory(station);
      if (newPlaylist && newPlaylist.length > 0) {
        setPlaylistState(newPlaylist);
        const idx = newPlaylist.findIndex((s) => s.id === station.id);
        setNowPlayingIndex(idx >= 0 ? idx : 0);
      } else {
        setPlaylistState((prev) => {
          const idx = prev.findIndex((s) => s.id === station.id);
          if (idx !== -1) {
            setNowPlayingIndex(idx);
            return prev;
          }
          setNowPlayingIndex(0);
          return [station, ...prev];
        });
      }
    },
    [addToHistory]
  );

  const setPlaylist = useCallback(
    (newPlaylist: Station[]) => {
      setPlaylistState(newPlaylist);
      if (nowPlaying) {
        const idx = newPlaylist.findIndex((s) => s.id === nowPlaying.id);
        setNowPlayingIndex(idx);
      }
    },
    [nowPlaying]
  );

  const navigatePlaylist = useCallback(
    (direction: "prev" | "next") => {
      if (playlist.length === 0 || nowPlayingIndex === -1) return;
      const nextIdx =
        direction === "next"
          ? (nowPlayingIndex + 1) % playlist.length
          : (nowPlayingIndex - 1 + playlist.length) % playlist.length;
      const nextStation = playlist[nextIdx];
      if (nextStation) {
        setNowPlaying(nextStation);
        setNowPlayingIndex(nextIdx);
        addToHistory(nextStation);
      }
    },
    [playlist, nowPlayingIndex, addToHistory]
  );

  return (
    <PlayerContext.Provider
      value={{
        nowPlaying,
        playlist,
        nowPlayingIndex,
        playStation,
        setPlaylist,
        navigatePlaylist,
        isFavorited,
        toggleFavorite,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextType {
  return useContext(PlayerContext);
}
