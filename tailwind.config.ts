import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        // The system's only two accent colors — see DESIGN.md "The Two-Signal
        // Rule". Never reach for a third accent hue; every other color
        // decision in this app is white-on-black at varying opacity.
        "signal-green": "#4ade80", // live / currently playing
        "ember-red": "#f87171", // favorited
        "ember-red-light": "#fca5a5", // favorited, hover
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
        "slide-in-right": "slide-in-right 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
