import type { CityMarker } from "@/lib/radio-api/types";
import { TECHNICAL_TEXT_CLASS, formatCityCountry, formatStationCount } from "@/lib/format";

interface CityOverlayProps {
  city: CityMarker | null;
}

export function CityOverlay({ city }: CityOverlayProps) {
  if (!city) {
    return null;
  }

  return (
    <div data-testid="city-overlay" className="flex flex-col gap-1 p-6">
      <h2 className="text-4xl text-white">{city.city}.</h2>
      <span className={TECHNICAL_TEXT_CLASS}>{formatCityCountry(city.city, city.countryName)}</span>
      <span className={TECHNICAL_TEXT_CLASS}>{formatStationCount(city.stationCount)}</span>
    </div>
  );
}
