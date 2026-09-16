export const TECHNICAL_TEXT_CLASS = "text-xs uppercase tracking-wide text-white/50";

export function formatCityCountry(city: string, country: string): string {
  return `${city}, ${country}`;
}

export function formatStationCount(count: number): string {
  return `${count} station${count === 1 ? "" : "s"}`;
}

export function formatBitrate(bitrate: number): string {
  return `${bitrate} KBPS`;
}
