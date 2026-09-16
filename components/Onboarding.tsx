"use client";

import { useEffect, useState } from "react";

const ONBOARDING_KEY = "radio-atlas:onboarding-done";

const LINES = [
  "A world of sound.",
  "Thousands of stations.\nOne planet.",
] as const;

interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // 0=line1, 1=line2, 2=cta

  // Advance through phases automatically
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1800),
      setTimeout(() => setPhase(2), 3600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  function handleStart() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    onDone();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
      onClick={phase < 2 ? undefined : handleStart}
    >
      {/* Skip button */}
      <button
        type="button"
        onClick={handleStart}
        className="absolute right-6 top-6 text-[10px] uppercase tracking-widest text-white/30 transition-colors hover:text-white/60"
      >
        Skip
      </button>

      {/* Text sequence */}
      <div className="relative flex flex-col items-center gap-6 text-center">
        {/* Line 1 */}
        <p
          className={`text-3xl font-light tracking-tight text-white transition-all duration-700 ${
            phase >= 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          } ${phase === 1 ? "opacity-40" : ""} ${phase === 2 ? "opacity-0 -translate-y-4" : ""}`}
        >
          A world of sound.
        </p>

        {/* Line 2 */}
        <p
          className={`whitespace-pre-line text-3xl font-light tracking-tight text-white transition-all duration-700 ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          } ${phase === 2 ? "opacity-0 -translate-y-4" : ""}`}
        >
          {LINES[1]}
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={handleStart}
          className={`mt-4 rounded-full border border-white/20 px-8 py-3 text-sm font-medium text-white transition-all duration-500 hover:bg-white/10 ${
            phase === 2 ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-4"
          }`}
        >
          Start exploring
        </button>
      </div>

      {/* Brand */}
      <span className="absolute bottom-8 text-[10px] uppercase tracking-[0.25em] text-white/20">
        Radio Atlas
      </span>
    </div>
  );
}

/** Returns true when the onboarding has NOT been completed yet */
export function shouldShowOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(ONBOARDING_KEY);
}
