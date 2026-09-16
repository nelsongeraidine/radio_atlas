import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationCard } from "./StationCard";
import type { Station } from "@/lib/radio-api/types";

const station: Station = {
  id: "1",
  name: "Radio Test",
  url: "http://stream.example/live",
  country: "France",
  countryCode: "FR",
  language: "french",
  tags: ["pop"],
  votes: 10,
};

describe("StationCard", () => {
  it("renders station name and calls onPlay when clicked", async () => {
    const onPlay = vi.fn();
    render(<StationCard station={station} isPlaying={false} onPlay={onPlay} />);
    await userEvent.click(screen.getByText("Radio Test"));
    expect(onPlay).toHaveBeenCalledWith(station);
  });

  it("omits bitrate text when the API didn't return a bitrate", () => {
    render(<StationCard station={station} isPlaying={false} onPlay={vi.fn()} />);
    expect(screen.queryByText(/KBPS/)).not.toBeInTheDocument();
  });

  it("shows bitrate when present", () => {
    render(
      <StationCard station={{ ...station, bitrate: 128 }} isPlaying={false} onPlay={vi.fn()} />
    );
    expect(screen.getByText(/128 KBPS/)).toBeInTheDocument();
  });
});
