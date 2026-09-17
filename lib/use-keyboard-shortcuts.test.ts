import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

describe("useKeyboardShortcuts", () => {
  it("triggers play/pause callback on Space keydown", () => {
    const onTogglePlayPause = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onTogglePlayPause }));

    const event = new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);

    expect(onTogglePlayPause).toHaveBeenCalledTimes(1);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("triggers mute on KeyM", () => {
    const onToggleMute = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleMute }));

    const event = new KeyboardEvent("keydown", { code: "KeyM", key: "m", bubbles: true });
    window.dispatchEvent(event);

    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it("triggers prev on ArrowLeft and KeyJ", () => {
    const onPrev = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onPrev }));

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowLeft", key: "ArrowLeft", bubbles: true }));
    expect(onPrev).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ", key: "j", bubbles: true }));
    expect(onPrev).toHaveBeenCalledTimes(2);
  });

  it("triggers next on ArrowRight and KeyK", () => {
    const onNext = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onNext }));

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight", key: "ArrowRight", bubbles: true }));
    expect(onNext).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyK", key: "k", bubbles: true }));
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it("triggers favorite on KeyL and KeyF", () => {
    const onToggleFavorite = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleFavorite }));

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyL", key: "l", bubbles: true }));
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyF", key: "f", bubbles: true }));
    expect(onToggleFavorite).toHaveBeenCalledTimes(2);
  });

  it("triggers help modal on question mark", () => {
    const onToggleHelp = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleHelp }));

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Slash", key: "?", shiftKey: true, bubbles: true }));
    expect(onToggleHelp).toHaveBeenCalledTimes(1);
  });

  it("ignores shortcuts when modifier keys are pressed (e.g. Ctrl+K)", () => {
    const onTogglePlayPause = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onTogglePlayPause }));

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", key: " ", ctrlKey: true, bubbles: true }));
    expect(onTogglePlayPause).not.toHaveBeenCalled();
  });

  it("does nothing when disabled is true", () => {
    const onTogglePlayPause = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onTogglePlayPause, disabled: true }));

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true }));
    expect(onTogglePlayPause).not.toHaveBeenCalled();
  });
});
