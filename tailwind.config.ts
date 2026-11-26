import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Fredoka Variable'", "Fredoka", "system-ui", "sans-serif"],
        sans: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        navy: { 950: "#08111f", 900: "#0d1a2e", 800: "#132440", 700: "#1b3157", 600: "#24406f" },
        ocean: { 700: "#1a5c96", 600: "#2170b3", 500: "#2d86cc", 400: "#4da3e0" },
        land: { 600: "#5d9c4e", 500: "#73b25f", 400: "#8cc574", 300: "#a8d68f" },
        gold: { 500: "#f2b134", 400: "#f7c552", 300: "#fbd97e" },
        parchment: { 50: "#fdfcf8", 100: "#f8f5ec", 200: "#efe9d8" },
      },
      boxShadow: {
        game: "0 10px 30px -8px rgba(8,17,31,0.45), 0 2px 6px rgba(8,17,31,0.25)",
        pop: "0 4px 0 0 rgba(8,17,31,0.35)",
        inset: "inset 0 2px 0 rgba(255,255,255,0.25)",
      },
      keyframes: {
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
        pulseRing: { "0%": { transform: "scale(0.9)", opacity: "0.7" }, "100%": { transform: "scale(1.6)", opacity: "0" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        floaty: "floaty 3s ease-in-out infinite",
        pulseRing: "pulseRing 2s ease-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
