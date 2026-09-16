// Raw shapes returned by the Radio Browser API (https://www.radio-browser.info)

export interface RawCountry {
  name: string;
  iso_3166_1: string;
  stationcount: number;
}

export interface RawStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  tags: string;
  bitrate: number;
  codec: string;
  favicon: string;
  votes: number;
  lastcheckok: number;
}

// Types used across the app

export interface Country {
  name: string;
  countryCode: string;
  stationCount: number;
}

export interface Station {
  id: string;
  name: string;
  url: string;
  fallbackUrl?: string;
  country: string;
  countryCode: string;
  state?: string;
  language?: string;
  tags: string[];
  bitrate?: number;
  codec?: string;
  favicon?: string;
  votes: number;
}

export interface CityMarker {
  city: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lon: number;
  stationCount: number;
}

export interface CityEntry {
  city: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lon: number;
}
