import type { Config } from "tailwindcss";

// Mobile-first breakpoints per architecture plan §7 - 360px is the design floor.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        orbitron: ["var(--font-orbitron)", "sans-serif"],
        bebas: ["var(--font-bebas)", "sans-serif"],
      },
      colors: {
        // sourced from packages/design-tokens in later phases; hardcoded here for MVP
        brand: {
          50: "#f4f1ff",
          500: "#6d28d9",
          600: "#5b21b6",
          900: "#1e1033"
        }
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "spin-reverse": "spin-reverse 12s linear infinite",
        "bounce-soft": "bounce-soft 1s ease-in-out infinite",
        "sparkle": "sparkle 2s ease-in-out infinite",
        "burst": "burst 0.8s ease-out forwards",
        "float-up": "float-up 3s ease-out forwards",
      },
      keyframes: {
        "spin-reverse": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-10px) scale(1.05)" },
        },
        "sparkle": {
          "0%, 100%": { opacity: "0", transform: "scale(0) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1) rotate(180deg)" },
        },
        "burst": {
          "0%": { transform: "translate(0, 0) scale(1)", opacity: "1" },
          "100%": { transform: "translate(var(--tx), var(--ty)) scale(0)", opacity: "0" },
        },
        "float-up": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-100px) scale(1.5)", opacity: "0" },
        },
      },
    }
  },
  plugins: []
};

export default config;
