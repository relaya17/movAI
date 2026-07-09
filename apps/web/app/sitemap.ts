import type { MetadataRoute } from "next";
import { listMovies, listContentByType } from "@/lib/movies";

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100").replace(/\/$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const [movies, standup, music, singing] = await Promise.all([
    listMovies(500),
    listContentByType("standup", 200),
    listContentByType("music", 200),
    listContentByType("singing", 200)
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/browse`, changeFrequency: "daily", priority: 0.9 },
    { url: `${origin}/pricing`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${origin}/pricing/subscription`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${origin}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/legal/security`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${origin}/legal/cookies`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${origin}/legal/dmca`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${origin}/legal/accessibility`, changeFrequency: "yearly", priority: 0.2 }
  ];

  const catalogRoutes = [...movies, ...standup, ...music, ...singing].map((item) => ({
    url: `${origin}/movie/${item.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8
  }));

  return [...staticRoutes, ...catalogRoutes];
}
