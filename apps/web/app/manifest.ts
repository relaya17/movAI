import type { MetadataRoute } from "next";

// PWA manifest - architecture plan §7. Installable on mobile home screens.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MoVAI — סרטים חוקיים וחינמיים",
    short_name: "MoVAI",
    description: "מנוע גילוי סרטים חוקיים וחינמיים עם המלצות AI וחיפוש סמנטי.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#083344",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
