"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";
import type { CityMarker } from "@/lib/radio-api/types";
import { TECHNICAL_TEXT_CLASS, formatCityCountry, formatStationCount } from "@/lib/format";

interface CityOverlayProps {
  city: CityMarker | null;
  allCities?: CityMarker[];
  onSelectCity?: (city: CityMarker) => void;
  scopeFilter?: "LOCAL" | "WORLD";
  onScopeChange?: (scope: "LOCAL" | "WORLD") => void;
}

export function CityOverlay({
  city,
  allCities = [],
  onSelectCity,
  scopeFilter = "LOCAL",
  onScopeChange,
}: CityOverlayProps) {
  const [scope, setScope] = useState<"LOCAL" | "WORLD">(scopeFilter);

  if (!city) {
    return null;
  }

  function handleScopeToggle(next: "LOCAL" | "WORLD") {
    setScope(next);
    onScopeChange?.(next);
  }

  function handleSomewhereNew() {
    if (!allCities.length || !onSelectCity) return;
    const others = allCities.filter(
      (c) => !(c.city === city!.city && c.countryCode === city!.countryCode)
    );
    if (!others.length) return;
    const random = others[Math.floor(Math.random() * others.length)];
    onSelectCity(random);
  }

  return (
    <div
      data-testid="city-overlay"
      className="animate-slide-in-right border-b border-white/10 p-6"
    >
      {/* City name */}
      <h2 className="mb-1 text-[2.25rem] font-light leading-none tracking-tight text-white">
        {city.city}.
      </h2>

      {/* Meta line */}
      <div className="mb-4 flex flex-col gap-1">
        <span className={TECHNICAL_TEXT_CLASS}>{formatCityCountry(city.city, city.countryName)}</span>
        <span className={TECHNICAL_TEXT_CLASS}>{formatStationCount(city.stationCount)}</span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-2">
        {/* LOCAL / WORLD scope toggle */}
        <div className="flex rounded border border-white/10 text-[10px] uppercase tracking-widest">
          {(["LOCAL", "WORLD"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleScopeToggle(s)}
              className={`px-2.5 py-1 transition-colors duration-150 ${
                scope === s
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Somewhere new */}
        {onSelectCity && allCities.length > 1 && (
          <button
            type="button"
            onClick={handleSomewhereNew}
            className={`flex items-center gap-1.5 rounded border border-white/10 px-2.5 py-1 transition-colors duration-150 hover:bg-white/5 ${TECHNICAL_TEXT_CLASS}`}
          >
            <Shuffle size={10} />
            Somewhere new
          </button>
        )}
      </div>
    </div>
  );
}
