import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { PlayerProvider, usePlayer } from "./player-context";
import type { Station } from "./radio-api/types";
import type { ReactNode } from "react";

const stationA: Station = {
  id: "s-1",
  name: "Station Alpha",
  url: "http://stream.test/alpha",
  country: "France",
  countryCode: "FR",
  tags: ["jazz"],
  votes: 10,
};

const stationB: Station = {
  id: "s-2",
  name: "Station Beta",
  url: "http://stream.test/beta",
  country: "Japan",
  countryCode: "JP",
  tags: ["ambient"],
  votes: 20,
};

function wrapper({ children }: { children: ReactNode }) {
  return <PlayerProvider>{children}</PlayerProvider>;
}

describe("player-context", () => {
  it("initializes with null nowPlaying and empty playlist", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    expect(result.current.nowPlaying).toBeNull();
    expect(result.current.playlist).toEqual([]);
    expect(result.current.nowPlayingIndex).toBe(-1);
  });

  it("playStation sets nowPlaying and updates playlist", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.playStation(stationA, [stationA, stationB]);
    });
    expect(result.current.nowPlaying).toEqual(stationA);
    expect(result.current.playlist).toHaveLength(2);
    expect(result.current.nowPlayingIndex).toBe(0);
  });

  it("navigatePlaylist moves next and wraps around", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.playStation(stationA, [stationA, stationB]);
    });
    expect(result.current.nowPlayingIndex).toBe(0);

    act(() => {
      result.current.navigatePlaylist("next");
    });
    expect(result.current.nowPlaying).toEqual(stationB);
    expect(result.current.nowPlayingIndex).toBe(1);

    act(() => {
      result.current.navigatePlaylist("next");
    });
    expect(result.current.nowPlaying).toEqual(stationA);
    expect(result.current.nowPlayingIndex).toBe(0);
  });

  it("navigatePlaylist moves prev and wraps around", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.playStation(stationA, [stationA, stationB]);
    });
    expect(result.current.nowPlayingIndex).toBe(0);

    act(() => {
      result.current.navigatePlaylist("prev");
    });
    expect(result.current.nowPlaying).toEqual(stationB);
    expect(result.current.nowPlayingIndex).toBe(1);
  });

  it("toggles favorite for a station", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    expect(result.current.isFavorited(stationA)).toBe(false);

    act(() => {
      result.current.toggleFavorite(stationA);
    });
    expect(result.current.isFavorited(stationA)).toBe(true);

    act(() => {
      result.current.toggleFavorite(stationA);
    });
    expect(result.current.isFavorited(stationA)).toBe(false);
  });
});
