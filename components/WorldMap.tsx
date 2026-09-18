"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CityMarker } from "@/lib/radio-api/types";
import { formatCityCountry } from "@/lib/format";

interface WorldMapProps {
  cities: CityMarker[];
  onSelectCity: (city: CityMarker) => void;
  flyToCity?: CityMarker | null;
  initialProjection?: "mercator" | "globe";
}

const STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Basemap place/POI labels compete visually with our own city markers (a "Berlin" label
// rendered right on top of our marker reads as a single white blob at city zoom levels).
// Country/state/continent/water labels stay for orientation; only city-and-finer labels go.
const HIDDEN_LAYER_IDS = [
  "place_hamlet",
  "place_suburbs",
  "place_villages",
  "place_town",
  "place_city_r6",
  "place_city_r5",
  "place_city_dot_r7",
  "place_city_dot_r4",
  "place_city_dot_r2",
  "place_city_dot_z7",
  "place_capital_dot_z7",
  "poi_stadium",
  "poi_park",
];

// ── Star / shooting star types ────────────────────────────────────────────────
type Star = {
  x: number;         // 0-1 relative to canvas width
  y: number;         // 0-1 relative to canvas height
  r: number;         // radius in px
  speed: number;     // twinkle speed
  offset: number;    // twinkle phase offset
  baseAlpha: number;
  color: string;     // subtle colour variation for realism
};

type ShootingStar = {
  x: number; y: number;
  vx: number; vy: number;
  len: number; alpha: number; life: number; maxLife: number;
};

const STAR_COLORS = ["255,255,255", "220,230,255", "255,240,220", "200,220,255"];

function makeStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.3 + 0.2,
    speed: Math.random() * 0.025 + 0.006,
    offset: Math.random() * Math.PI * 2,
    baseAlpha: Math.random() * 0.55 + 0.25,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
  }));
}

export function WorldMap({
  cities,
  onSelectCity,
  flyToCity,
  initialProjection = "mercator",
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const [projection, setProjection] = useState<"mercator" | "globe">(initialProjection);

  // Stars overlay refs
  const starsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const shootingRef = useRef<ShootingStar[]>([]);
  const frameRef = useRef(0);

  // ── Map initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const isGlobe = initialProjection === "globe";
    mapRef.current = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: isGlobe ? [0, 10] : [0, 20],
      zoom: isGlobe ? 1.2 : 1.5,
      pitch: 0,
      bearing: 0,
      attributionControl: { compact: true },
    });
    const map = mapRef.current;
    map.on("load", () => {
      for (const layerId of HIDDEN_LAYER_IDS) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", "none");
        }
      }
      if (isGlobe) {
        map.setProjection({ type: "globe" });
      }
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initialProjection]);

  // ── Projection toggle ─────────────────────────────────────────────────────
  function handleSwitchProjection(next: "mercator" | "globe") {
    if (next === projection) return;
    setProjection(next);
    const map = mapRef.current;
    if (!map) return;

    if (next === "globe") {
      map.setProjection({ type: "globe" });
      // Globe mode: pitch 0 gives a clean sphere — no tilt needed
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    } else {
      map.setProjection({ type: "mercator" });
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  }

  // ── Stars & shooting stars canvas animation ───────────────────────────────
  useEffect(() => {
    // Generate stars lazily once
    if (!starsRef.current.length) {
      starsRef.current = makeStars(250);
    }

    if (projection !== "globe") {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = starsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let lastW = 0;
    let lastH = 0;

    function spawnShooting(W: number, H: number) {
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.5;
      const speed = 6 + Math.random() * 6;
      shootingRef.current.push({
        x: Math.random() * W * 0.65,
        y: Math.random() * H * 0.45,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: 80 + Math.random() * 60,
        alpha: 1,
        life: 0,
        maxLife: 28 + Math.random() * 18,
      });
    }

    function draw() {
      if (document.hidden) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      const W = canvas!.offsetWidth;
      const H = canvas!.offsetHeight;

      if (W !== lastW || H !== lastH) {
        canvas!.width = W;
        canvas!.height = H;
        lastW = W;
        lastH = H;
      }

      ctx!.clearRect(0, 0, W, H);
      const t = ++frameRef.current;

      // Draw stars. Reduced motion: fixed brightness, no twinkle.
      for (const s of starsRef.current) {
        const alpha = prefersReducedMotion
          ? s.baseAlpha
          : s.baseAlpha * (0.55 + 0.45 * Math.sin(t * s.speed + s.offset));
        ctx!.beginPath();
        ctx!.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${s.color},${alpha.toFixed(2)})`;
        ctx!.fill();
      }

      if (prefersReducedMotion) {
        // Static sky: draw once, no shooting stars, no animation loop.
        return;
      }

      // Spawn a shooting star roughly every 5s at 60fps
      if (t % 300 === 0) spawnShooting(W, H);

      // Draw & update shooting stars
      shootingRef.current = shootingRef.current.filter((sh) => sh.life < sh.maxLife);
      for (const sh of shootingRef.current) {
        const progress = sh.life / sh.maxLife;
        const alpha = sh.alpha * (1 - progress);
        const tailX = sh.x - sh.vx * 4;
        const tailY = sh.y - sh.vy * 4;
        const grad = ctx!.createLinearGradient(tailX, tailY, sh.x, sh.y);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(1, `rgba(255,255,255,${alpha.toFixed(2)})`);
        ctx!.beginPath();
        ctx!.moveTo(tailX, tailY);
        ctx!.lineTo(sh.x, sh.y);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life++;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [projection]);

  // ── Fly to city ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToCity) return;
    map.flyTo({
      center: [flyToCity.lon, flyToCity.lat],
      zoom: 9,
      duration: 1800,
      essential: true,
    });
  }, [flyToCity]);

  // ── City markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = cities.map((city) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("data-testid", `city-marker-${city.city}`);
      el.setAttribute("aria-label", formatCityCountry(city.city, city.countryName));
      // Invisible 44x44 hit area centered on the marker, keeping the visible pulse ring small
      el.className = "relative flex h-11 w-11 items-center justify-center";
      el.innerHTML = `<span class="relative flex h-3 w-3 items-center justify-center rounded-full marker-pulse"><span class="block h-2 w-2 rounded-full bg-white shadow-[0_0_4px_2px_rgba(255,255,255,0.5)] transition-transform duration-200 hover:scale-150"></span></span>`;
      el.addEventListener("click", () => onSelectCity(city));
      return new MapLibreMarker({ element: el }).setLngLat([city.lon, city.lat]).addTo(map);
    });
  }, [cities, onSelectCity]);

  const isGlobe = projection === "globe";

  return (
    <div className="relative h-full w-full">
      {/* ── MapLibre canvas — must be h-full/w-full for MapLibre to get its size ── */}
      <div ref={containerRef} data-testid="world-map" className="h-full w-full" />

      {/* ── Stars (mix-blend-mode:screen → only visible over black space) ── */}
      <canvas
        ref={starsCanvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full pointer-events-none"
        style={{
          zIndex: 2,
          opacity: isGlobe ? 1 : 0,
          transition: "opacity 1.4s ease",
          mixBlendMode: "screen",
        }}
      />

      {/* ── Atmospheric blue glow around globe edge ──────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 3,
          opacity: isGlobe ? 1 : 0,
          transition: "opacity 1.4s ease",
          background:
            "radial-gradient(ellipse 48% 48% at 50% 50%, transparent 42%, rgba(40,100,220,0.10) 56%, rgba(60,140,255,0.06) 64%, transparent 74%)",
          mixBlendMode: "screen",
        }}
      />

      {/* ── Moon ──────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: "13%",
          right: "9%",
          zIndex: 4,
          opacity: isGlobe ? 1 : 0,
          transform: isGlobe ? "scale(1) translateY(0)" : "scale(0.5) translateY(-16px)",
          transition: "opacity 1.6s ease, transform 1.6s ease",
        }}
      >
        {/* Soft glow behind moon */}
        <div
          style={{
            position: "absolute",
            inset: -20,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 50% 50%, rgba(210,190,145,0.12) 20%, transparent 70%)",
          }}
        />
        {/* Moon body */}
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 38% 36%, #ece2ce 0%, #d6c9b0 26%, #baa98c 50%, #8c7a60 76%, #5c4e38 100%)",
            boxShadow:
              "inset -14px -10px 28px rgba(0,0,0,0.55), inset 4px 4px 12px rgba(255,255,240,0.18), 0 0 16px rgba(210,190,150,0.16)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Terminator (day/night boundary) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse 60% 100% at 78% 50%, rgba(0,0,0,0.38) 0%, transparent 58%)",
            }}
          />
          {/* Mare (dark patches) */}
          <div style={{ position: "absolute", top: "18%", left: "20%", width: 17, height: 14, borderRadius: "50%", background: "rgba(0,0,0,0.19)", boxShadow: "inset 1px 1px 3px rgba(255,255,220,0.12)" }} />
          <div style={{ position: "absolute", top: "52%", left: "40%", width: 11, height: 9, borderRadius: "50%", background: "rgba(0,0,0,0.15)", boxShadow: "inset 1px 1px 2px rgba(255,255,220,0.10)" }} />
          {/* Craters */}
          <div style={{ position: "absolute", top: "30%", left: "60%", width: 7, height: 7, borderRadius: "50%", background: "rgba(0,0,0,0.13)" }} />
          <div style={{ position: "absolute", top: "66%", left: "22%", width: 8, height: 7, borderRadius: "50%", background: "rgba(0,0,0,0.11)", boxShadow: "inset 1px 1px 2px rgba(255,255,220,0.08)" }} />
          <div style={{ position: "absolute", top: "44%", left: "14%", width: 5, height: 5, borderRadius: "50%", background: "rgba(0,0,0,0.10)" }} />
          {/* Highlight rim */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 32% 28%, rgba(255,255,240,0.22) 0%, transparent 46%)",
            }}
          />
        </div>
      </div>

      {/* ── 2D / 3D Projection Mode Switcher ──────────────────────────────── */}
      <div
        role="group"
        aria-label="Map projection"
        className="absolute left-4 top-4 z-20 flex items-center rounded-md border border-white/10 bg-black/70 p-0.5 backdrop-blur-md shadow-lg"
      >
        <button
          type="button"
          data-testid="projection-2d"
          aria-pressed={projection === "mercator"}
          onClick={() => handleSwitchProjection("mercator")}
          className={`min-h-11 rounded px-3 text-[12px] font-mono tracking-wider transition-all duration-150 ${
            projection === "mercator"
              ? "bg-white/15 text-white font-semibold shadow-sm"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          2D
        </button>
        <button
          type="button"
          data-testid="projection-3d"
          aria-pressed={projection === "globe"}
          onClick={() => handleSwitchProjection("globe")}
          className={`min-h-11 rounded px-3 text-[12px] font-mono tracking-wider transition-all duration-150 ${
            projection === "globe"
              ? "bg-white/15 text-white font-semibold shadow-sm"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          3D
        </button>
      </div>
    </div>
  );
}

