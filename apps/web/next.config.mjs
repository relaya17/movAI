import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // TMDB poster CDN + Cloudinary (hero promo assets) - only sources allowed for remote images (architecture plan §13.1 CSP)
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "res.cloudinary.com" }
    ]
  },
  async headers() {
    // Content-Security-Policy is NOT set here on purpose - it needs a
    // per-request nonce for the App Router's inline hydration scripts
    // (self.__next_f.push(...)), so it's generated in middleware.ts instead.
    // A static CSP without a nonce blocks those scripts entirely, which
    // silently kills all client-side JS (React never hydrates).
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ]
      }
    ];
  }
};

export default withNextIntl(nextConfig);
