import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioPlayer } from "./RadioPlayer";
import type { Station } from "@/lib/radio-api/types";

const station: Station = {
  id: "1",
  name: "Radio Test",
  url: "http://stream.example/live",
  fallbackUrl: "http://stream.example/fallback",
  country: "France",
  countryCode: "FR",
  tags: [],
  votes: 0,
};

beforeEach(() => {
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error cleanup
  delete globalThis.MediaMetadata;
  // @ts-expect-error cleanup
  delete navigator.mediaSession;
});

describe("RadioPlayer", () => {
  it("shows 'No station selected' when nothing is playing", () => {
    render(<RadioPlayer station={null} />);
    expect(screen.getByText("No station selected")).toBeInTheDocument();
  });

  it("shows TUNING… then TUNED IN once the stream can play", async () => {
    render(<RadioPlayer station={station} />);
    expect(screen.getByTestId("player-status")).toHaveTextContent("TUNING");
    const audio = screen.getByTestId("radio-player").querySelector("audio")!;
    act(() => {
      audio.dispatchEvent(new Event("canplay"));
    });
    expect(screen.getByTestId("player-status")).toHaveTextContent("LIVE");
  });

  it("falls back to fallbackUrl on stream error, then shows SIGNAL LOST if that fails too", async () => {
    render(<RadioPlayer station={station} />);
    const audio = screen.getByTestId("radio-player").querySelector("audio")!;
    act(() => {
      audio.dispatchEvent(new Event("error"));
    });
    expect(audio.src).toContain("fallback");
    act(() => {
      audio.dispatchEvent(new Event("error"));
    });
    expect(screen.getByTestId("player-status")).toHaveTextContent("SIGNAL LOST");
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("retries the stream when Try again is clicked", async () => {
    render(<RadioPlayer station={{ ...station, fallbackUrl: undefined }} />);
    const audio = screen.getByTestId("radio-player").querySelector("audio")!;
    act(() => {
      audio.dispatchEvent(new Event("error"));
    });
    await userEvent.click(screen.getByText("Try again"));
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("falls back then shows SIGNAL LOST when the stream never fires canplay/error (dead connection)", () => {
    vi.useFakeTimers();
    try {
      render(<RadioPlayer station={station} />);
      expect(screen.getByTestId("player-status")).toHaveTextContent("TUNING…");

      // Initial connection to the primary URL never resolves -> timeout fires -> fallback attempt.
      act(() => {
        vi.advanceTimersByTime(8000);
      });
      const audio = screen.getByTestId("radio-player").querySelector("audio")!;
      expect(audio.src).toContain("fallback");
      expect(screen.getByTestId("player-status")).toHaveTextContent("TUNING…");

      // Fallback connection also never resolves -> timeout fires again -> SIGNAL LOST.
      act(() => {
        vi.advanceTimersByTime(8000);
      });
      expect(screen.getByTestId("player-status")).toHaveTextContent("SIGNAL LOST");
      expect(screen.getByText("Try again")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not time out once canplay fires before the timeout elapses", () => {
    vi.useFakeTimers();
    try {
      render(<RadioPlayer station={{ ...station, fallbackUrl: undefined }} />);
      const audio = screen.getByTestId("radio-player").querySelector("audio")!;
      act(() => {
        audio.dispatchEvent(new Event("canplay"));
      });
      expect(screen.getByTestId("player-status")).toHaveTextContent("LIVE");

      act(() => {
        vi.advanceTimersByTime(8000);
      });
      expect(screen.getByTestId("player-status")).toHaveTextContent("LIVE");
    } finally {
      vi.useRealTimers();
    }
  });

  it("copies shareable station URL when share button is clicked", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<RadioPlayer station={station} />);
    const shareBtn = screen.getByLabelText("Share station");
    await userEvent.click(shareBtn);
    expect(writeTextMock).toHaveBeenCalled();
    expect(await screen.findByTestId("copied-toast")).toBeInTheDocument();
  });

  it("updates navigator.mediaSession metadata and playbackState", () => {
    class FakeMediaMetadata {
      title: string;
      artist: string;
      album: string;
      artwork: unknown[];
      constructor(init: { title: string; artist: string; album: string; artwork?: unknown[] }) {
        this.title = init.title;
        this.artist = init.artist;
        this.album = init.album;
        this.artwork = init.artwork || [];
      }
    }
    // @ts-expect-error mock MediaMetadata
    globalThis.MediaMetadata = FakeMediaMetadata;
    const setActionHandlerMock = vi.fn();
    Object.assign(navigator, {
      mediaSession: {
        metadata: null,
        playbackState: "none",
        setActionHandler: setActionHandlerMock,
      },
    });

    render(<RadioPlayer station={station} />);
    expect(navigator.mediaSession.metadata).toBeDefined();
    expect(navigator.mediaSession.metadata?.title).toBe("Radio Test");
    expect(setActionHandlerMock).toHaveBeenCalledWith("play", expect.any(Function));
    expect(setActionHandlerMock).toHaveBeenCalledWith("pause", expect.any(Function));
    expect(setActionHandlerMock).toHaveBeenCalledWith("previoustrack", expect.any(Function));
    expect(setActionHandlerMock).toHaveBeenCalledWith("nexttrack", expect.any(Function));
  });

  it("handles global keyboard shortcuts for player control", () => {
    const onNavigate = vi.fn();
    const onToggleFavorite = vi.fn();

    render(
      <RadioPlayer
        station={station}
        playlist={[station, { ...station, id: "2" }]}
        nowPlayingIndex={0}
        onNavigate={onNavigate}
        onToggleFavorite={onToggleFavorite}
      />
    );

    // Mute via 'M' key
    fireEvent.keyDown(window, { code: "KeyM", key: "m" });
    expect(screen.getByLabelText("Unmute")).toBeInTheDocument();

    // Next via 'K' or ArrowRight
    fireEvent.keyDown(window, { code: "KeyK", key: "k" });
    expect(onNavigate).toHaveBeenCalledWith("next");

    // Toggle favorite via 'L'
    fireEvent.keyDown(window, { code: "KeyL", key: "l" });
    expect(onToggleFavorite).toHaveBeenCalledWith(station);

    // Toggle shortcuts guide via '?'
    fireEvent.keyDown(window, { code: "Slash", key: "?", shiftKey: true });
    expect(screen.getByTestId("shortcuts-modal")).toBeInTheDocument();
  });

  it("does not trigger keyboard shortcuts when typing in an input element", () => {
    const onNavigate = vi.fn();
    render(
      <div>
        <input data-testid="search-input" />
        <RadioPlayer
          station={station}
          playlist={[station, { ...station, id: "2" }]}
          nowPlayingIndex={0}
          onNavigate={onNavigate}
        />
      </div>
    );

    const input = screen.getByTestId("search-input");
    input.focus();

    // Fire Space while focused on input - should not toggle play or prevent default
    const event = new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("collapses into mini-player and expands back on mobile", async () => {
    render(<RadioPlayer station={station} />);
    const collapseBtn = screen.getByTestId("collapse-player-btn");

    await userEvent.click(collapseBtn);
    expect(screen.getByTestId("radio-player-collapsed")).toBeInTheDocument();

    const expandBtn = screen.getByTestId("expand-player-btn");
    await userEvent.click(expandBtn);
    expect(screen.queryByTestId("radio-player-collapsed")).not.toBeInTheDocument();
  });
});
