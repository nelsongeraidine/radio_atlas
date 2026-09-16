import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Onboarding, getTimezoneGreeting, shouldShowOnboarding } from "./Onboarding";

describe("getTimezoneGreeting", () => {
  it("formats morning, afternoon, evening, and late night properly", () => {
    const morning = new Date("2026-09-16T08:00:00");
    expect(getTimezoneGreeting(morning)).toMatch(/Good morning/);

    const afternoon = new Date("2026-09-16T14:00:00");
    expect(getTimezoneGreeting(afternoon)).toMatch(/Good afternoon/);

    const evening = new Date("2026-09-16T20:00:00");
    expect(getTimezoneGreeting(evening)).toMatch(/Good evening/);

    const lateNight = new Date("2026-09-16T02:00:00");
    expect(getTimezoneGreeting(lateNight)).toMatch(/Late night/);
  });
});

describe("Onboarding component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it("renders the adaptive greeting and advances through phases", () => {
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} />);

    expect(screen.getByTestId("onboarding-greeting")).toBeInTheDocument();
    expect(screen.getByText("A world of sound.")).toBeInTheDocument();

    // Advance to phase 1
    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByText(/Thousands of stations/)).toBeInTheDocument();

    // Advance to phase 2
    act(() => {
      vi.advanceTimersByTime(1800);
    });
    const startBtn = screen.getByText("Start exploring");
    expect(startBtn).toBeInTheDocument();

    fireEvent.click(startBtn);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(shouldShowOnboarding()).toBe(false);
  });

  it("completes onboarding when skip is clicked", () => {
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} />);

    fireEvent.click(screen.getByText("Skip"));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(shouldShowOnboarding()).toBe(false);
  });
});
