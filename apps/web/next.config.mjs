import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Cloudinary URLs are already transformed (f_auto/q_auto/w_*); a custom
    // loader serves them directly to the browser and skips /_next/image.
    // That avoids Node TLS failures (UNABLE_TO_VERIFY_LEAF_SIGNATURE) when a
    // local proxy/antivirus intercepts HTTPS - which otherwise 500s the
    // optimizer and stalls auth/browse pages for several seconds.
    loader: "custom",
    loaderFile: "./lib/cloudinary-loader.ts",
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
