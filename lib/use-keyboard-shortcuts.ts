"use client";

import { useEffect } from "react";

export interface KeyboardShortcutsOptions {
  onTogglePlayPause?: () => void;
  onToggleMute?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleFavorite?: () => void;
  onToggleHelp?: () => void;
  disabled?: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts({
  onTogglePlayPause,
  onToggleMute,
  onPrev,
  onNext,
  onToggleFavorite,
  onToggleHelp,
  disabled = false,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.code) {
        case "Space":
          event.preventDefault();
          onTogglePlayPause?.();
          break;
        case "KeyM":
          event.preventDefault();
          onToggleMute?.();
          break;
        case "ArrowLeft":
        case "KeyJ":
          event.preventDefault();
          onPrev?.();
          break;
        case "ArrowRight":
        case "KeyK":
          event.preventDefault();
          onNext?.();
          break;
        case "KeyL":
        case "KeyF":
          event.preventDefault();
          onToggleFavorite?.();
          break;
        case "Slash":
          if (event.shiftKey || event.key === "?") {
            event.preventDefault();
            onToggleHelp?.();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    disabled,
    onTogglePlayPause,
    onToggleMute,
    onPrev,
    onNext,
    onToggleFavorite,
    onToggleHelp,
  ]);
}
