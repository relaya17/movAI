"use client";

import { useEffect } from "react";

/** Registers the PWA service worker once on the client (production only). */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Dev uses ever-changing webpack chunks — a cache-first SW here serves
    // stale/404 HTML for /_next/static/* and breaks hydration (webpack
    // "Cannot read properties of undefined (reading 'call')").
    if (process.env.NODE_ENV === "development") {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister();
        }
      });
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration can fail on insecure origins other than localhost - ignore.
    });
  }, []);

  return null;
}
