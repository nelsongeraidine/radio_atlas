# Radio Atlas 🌍📻

> **A world of sound. Thousands of stations. One planet.**  
> An immersive, geographical web application to explore and listen to live radio stations around the globe in real time.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest%20%28100%25%20Passing%29-brightgreen?style=flat&logo=vitest)](https://vitest.dev/)

---

## ✨ Features

- **Dark Vector Basemap**: Interactive, clean cartography powered by MapLibre GL and CARTO Dark Matter tiles, featuring smooth cinematic camera movements (`flyTo`) and responsive city markers.
- **Real-World Airwaves**: Real-time streaming powered by the community-driven [Radio Browser API](https://www.radio-browser.info/) via an internal, resilient Node.js API proxy with automated mirror failover.
- **Persistent Global Audio**: Audio playback lives in the root layout (`GlobalPlayer`), allowing seamless, uninterrupted listening while navigating between **Explore**, **Discover**, and **Library**.
- **Stream Resilience**: Automatic 8-second connection timeout, seamless fallback URL switching, and graceful recovery (`TUNING…` → `LIVE` or `SIGNAL LOST`).
- **Command Palette (`Ctrl+K` / `⌘K`)**: Instant search across radio station names, curated cities, countries, and musical genres (`Ambient`, `Jazz`, `Electronic`, `Rock`, etc.), with recent search history stored locally.
- **LOCAL vs. WORLD Scope**: Easily switch between local stations in the selected city and top stations across the entire country.
- **HQ Bitrate Filter**: Toggle `HQ ONLY (≥128K)` to instantly filter out low-bandwidth streams and focus on high-fidelity broadcasts.
- **Editorial Discover**: Curated thematic carousels (*Around the World*, *Brazil*, *Electronic*, *Jazz*, *Europe*, *Late Night*, *Asia*, etc.).
- **Local Library**: Client-side persistence (`localStorage`) for Favorites, Recently Played stations, and Cities Visited.
- **Adaptive Timezone Onboarding**: Welcoming intro that detects local time of day and region from the visitor's timezone without requesting intrusive GPS permissions.
- **Refined Mobile Experience**: Responsive layout on smartphones (`flex-col md:flex-row`) with top map viewport, bottom station list, and compact audio player controls.
- **Deep Linking & Sharing**: Copy direct links to any station with one click and auto-play via query parameters (`/?city=...&cc=...&station=...`).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Runtime**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Minimalist editorial dark palette)
- **Map Engine**: [MapLibre GL](https://maplibre.org/) with CARTO Dark Matter vector tiles
- **Data Fetching & Cache**: [TanStack React Query](https://tanstack.com/query)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) & [Testing Library](https://testing-library.com/)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.18+ or 20+)
- `npm` or `pnpm`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nelsongeraidine/radio_atlas.git
   cd radio_atlas
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing & Code Quality

Radio Atlas enforces strict code quality with 100% test pass rates and zero lint/type errors:

```bash
# Run unit and integration tests (Vitest)
npm test

# Run ESLint validation
npm run lint

# Run TypeScript typecheck
npx tsc --noEmit
```

---

## 📂 Project Architecture

```text
app/
  ├── layout.tsx              # RootLayout with Inter font, Providers, and GlobalPlayer
  ├── page.tsx                # Explore page (Interactive Map + Sidebar + Deep Linking)
  ├── discover/page.tsx       # Discover page (Editorial thematic carousels)
  ├── library/page.tsx        # Library page (Favorites, Recents, Visited Cities)
  └── api/radio/              # Resilient Node.js API routes (seed, stations, countries, search)
components/
  ├── WorldMap.tsx            # Interactive MapLibre GL map component
  ├── CityOverlay.tsx         # Selected locality header with LOCAL / WORLD toggle
  ├── StationList.tsx         # Station list with HQ (≥128k) bitrate filter
  ├── StationCard.tsx         # Individual station card with play and favorite actions
  ├── RadioPlayer.tsx         # Fixed audio player with visualizer, volume, and sharing
  ├── GlobalPlayer.tsx        # Audio container mounted in root layout ensuring persistence
  ├── AudioVisualizer.tsx     # Minimalist audio visualizer with CSS animation
  ├── GlobalSearch.tsx        # Command palette (Ctrl+K / ⌘K) with genre & recent searches
  ├── DiscoverSection.tsx     # Horizontal carousel for Discover page
  ├── Spotlight.tsx           # Top 5 recommended stations for selected locality
  └── Onboarding.tsx          # Adaptive welcome screen with timezone-based greeting
lib/
  ├── radio-api/              # Resilient client with DNS mirror rotation pool
  ├── library.ts              # Local persistence hooks (useFavorites, useRecentSearches, etc.)
  ├── player-context.tsx      # Global audio context for continuous playback
  └── format.ts               # TECHNICAL_TEXT_CLASS and string formatters
```

---

## 📄 License & Acknowledgments

- Built with data from the community-driven [Radio Browser](https://www.radio-browser.info/) project.
- Map tiles provided by [CARTO](https://carto.com/) via OpenStreetMap.
