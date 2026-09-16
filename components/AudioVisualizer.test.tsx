import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AudioVisualizer } from "./AudioVisualizer";

describe("AudioVisualizer", () => {
  it("renders bars that animate when active", () => {
    render(<AudioVisualizer active />);
    const visualizer = screen.getByTestId("audio-visualizer");
    expect(visualizer.querySelectorAll("span")[0]).toHaveClass("animate-pulse");
  });

  it("renders static bars when inactive", () => {
    render(<AudioVisualizer active={false} />);
    const visualizer = screen.getByTestId("audio-visualizer");
    expect(visualizer.querySelectorAll("span")[0]).not.toHaveClass("animate-pulse");
  });
});
