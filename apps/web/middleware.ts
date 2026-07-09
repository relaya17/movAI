import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CSP (architecture plan §13 security).
 *
 * This used to be nonce-based. That broke: Next.js only applies a
 * per-request nonce to its inline hydration scripts
 * (self.__next_f.push(...)) on *dynamically* rendered pages - per Next's
 * own docs, "Static pages are generated at build time, when no request or
 * response headers exist, so no nonce can be injected." Our landing page,
 * /sign-in, /sign-up and the /legal/* pages are intentionally static (SEO +
 * CDN caching), so those inline scripts got no nonce and the browser
 * silently blocked hydration on every one of them - reproduced by building
 * and curling the app: 4 inline __next_f scripts, 0 with a nonce.
 * https://nextjs.org/docs/app/guides/content-security-policy
 *
 * Tried next: the docs' Subresource Integrity alternative (experimental,
 * next.config.mjs `experimental.sri`) - verified by building and inspecting
 * the output that it adds zero `integrity=` attributes on this Next.js
 * version (15.1.3), so it wasn't actually doing anything here. Removed it
 * rather than ship a config that only *looks* like a fix.
 *
 * Current fix: 'unsafe-inline' with no nonce/hash alongside it. Per the CSP3
 * spec, browsers only ignore 'unsafe-inline' when a nonce-source or
 * hash-source is present in the same directive - since neither is present
 * here, 'unsafe-inline' is honored normally. This is weaker than a true
 * nonce (any injected inline script would also execute), but forcing every
 * static page to render dynamically just to keep nonces working would cost
 * the SEO/CDN caching those pages exist for. React's default output
 * escaping and the absence of dangerouslySetInnerHTML anywhere in this app
 * are the practical XSS defense underneath this.
 */
export function middleware(request: NextRequest): NextResponse {
  const isDev = process.env.NODE_ENV === "development";

  const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-src https://www.youtube.com https://archive.org",
    "img-src 'self' https://image.tmdb.org https://res.cloudinary.com data:",
    "media-src 'self' https://res.cloudinary.com",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    // Service worker registration (public/sw.js) + same-origin workers.
    "worker-src 'self'",
    "manifest-src 'self'"
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Skip static assets and Next internals - CSP on those is unnecessary
    // and would just add overhead to every asset request.
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};
