import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
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
});
