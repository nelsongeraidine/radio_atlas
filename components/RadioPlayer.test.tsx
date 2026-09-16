import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  vi.stubGlobal(
    "HTMLMediaElement",
    class {
      play() {
        return Promise.resolve();
      }
      pause() {}
    }
  );
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

describe("RadioPlayer", () => {
  it("shows 'No station selected' when nothing is playing", () => {
    render(<RadioPlayer station={null} />);
    expect(screen.getByText("No station selected")).toBeInTheDocument();
  });

  it("shows TUNING… then TUNED IN once the stream can play", async () => {
    render(<RadioPlayer station={station} />);
    expect(screen.getByTestId("player-status")).toHaveTextContent("TUNING…");
    const audio = screen.getByTestId("radio-player").querySelector("audio")!;
    audio.dispatchEvent(new Event("canplay"));
    expect(screen.getByTestId("player-status")).toHaveTextContent("TUNED IN");
  });

  it("falls back to fallbackUrl on stream error, then shows SIGNAL LOST if that fails too", async () => {
    render(<RadioPlayer station={station} />);
    const audio = screen.getByTestId("radio-player").querySelector("audio")!;
    audio.dispatchEvent(new Event("error"));
    expect(audio.src).toContain("fallback");
    audio.dispatchEvent(new Event("error"));
    expect(screen.getByTestId("player-status")).toHaveTextContent("SIGNAL LOST");
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("retries the stream when Try again is clicked", async () => {
    render(<RadioPlayer station={{ ...station, fallbackUrl: undefined }} />);
    const audio = screen.getByTestId("radio-player").querySelector("audio")!;
    audio.dispatchEvent(new Event("error"));
    await userEvent.click(screen.getByText("Try again"));
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});
