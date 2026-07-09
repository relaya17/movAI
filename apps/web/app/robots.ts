import type { MetadataRoute } from "next";

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100").replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${origin}/sitemap.xml`
  };
}