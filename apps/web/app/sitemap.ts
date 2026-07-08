import type { MetadataRoute } from "next";
import { listMovies } from "@/lib/movies";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const movies = await listMovies();
  return [
    { url: "https://example.com/", changeFrequency: "daily", priority: 1 },
    ...movies.map((movie) => ({
      url: `https://example.com/movie/${movie.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8
    }))
  ];
}
