"use client";

import { useEffect, useState } from "react";

const ONBOARDING_KEY = "radio-atlas:onboarding-done";

const LINES = [
  "A world of sound.",
  "Thousands of stations.\nOne planet.",
] as const;

export function getTimezoneGreeting(date = new Date()): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const hour = date.getHours();
    let timeOfDay = "Good day";
    if (hour >= 5 && hour < 12) {
      timeOfDay = "Good morning";
    } else if (hour >= 12 && hour < 18) {
      timeOfDay = "Good afternoon";
    } else if (hour >= 18 && hour < 23) {
      timeOfDay = "Good evening";
    } else {
      timeOfDay = "Late night";
    }

    const tzCountryMap: Record<string, string> = {
      "America/Sao_Paulo": "Brazil",
      "America/Bahia": "Brazil",
      "America/Manaus": "Brazil",
      "America/Fortaleza": "Brazil",
      "America/Recife": "Brazil",
      "America/Belem": "Brazil",
      "America/Cuiaba": "Brazil",
      "America/Rio_Branco": "Brazil",
      "America/New_York": "the United States",
      "America/Chicago": "the United States",
      "America/Denver": "the United States",
      "America/Los_Angeles": "the United States",
      "Europe/London": "the United Kingdom",
      "Europe/Paris": "France",
      "Europe/Berlin": "Germany",
      "Europe/Rome": "Italy",
      "Europe/Madrid": "Spain",
      "Europe/Lisbon": "Portugal",
      "Asia/Tokyo": "Japan",
      "Asia/Seoul": "South Korea",
      "Asia/Shanghai": "China",
      "Asia/Kolkata": "India",
      "Australia/Sydney": "Australia",
      "Australia/Melbourne": "Australia",
      "Pacific/Auckland": "New Zealand",
      "America/Toronto": "Canada",
      "America/Mexico_City": "Mexico",
      "America/Argentina/Buenos_Aires": "Argentina",
    };

    const location = tzCountryMap[tz];
    if (location) {
      return `${timeOfDay} from ${location}.`;
    }
    return `${timeOfDay}.`;
  } catch {
    return "Welcome.";
  }
}

interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // 0=line1, 1=line2, 2=cta
  const [greeting] = useState(() => (typeof window !== "undefined" ? getTimezoneGreeting() : ""));

  // Advance through phases automatically
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1800),
      setTimeout(() => setPhase(2), 3600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  function handleStart(e?: React.MouseEvent) {
    e?.stopPropagation();
    localStorage.setItem(ONBOARDING_KEY, "1");
    onDone();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
      onClick={phase < 2 ? undefined : (e) => { if (e.target === e.currentTarget) handleStart(e); }}
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
        {/* Adaptive greeting */}
        {greeting && (
          <span
            data-testid="onboarding-greeting"
            className="text-xs uppercase tracking-[0.25em] text-white/40 transition-opacity duration-500"
          >
            {greeting}
          </span>
        )}

        {/* Line 1 */}
        <p
          className={`text-3xl font-light tracking-tight text-white transition-all duration-700 motion-reduce:translate-y-0 motion-reduce:duration-200 ${
            phase >= 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          } ${phase === 1 ? "opacity-40" : ""} ${phase === 2 ? "opacity-0 -translate-y-4" : ""}`}
        >
          A world of sound.
        </p>

        {/* Line 2 */}
        <p
          className={`whitespace-pre-line text-3xl font-light tracking-tight text-white transition-all duration-700 motion-reduce:translate-y-0 motion-reduce:duration-200 ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          } ${phase === 2 ? "opacity-0 -translate-y-4" : ""}`}
        >
          {LINES[1]}
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={handleStart}
          className={`mt-4 rounded-full border border-white/20 px-8 py-3 text-sm font-medium text-white transition-all duration-500 motion-reduce:translate-y-0 motion-reduce:duration-200 hover:bg-white/10 ${
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
