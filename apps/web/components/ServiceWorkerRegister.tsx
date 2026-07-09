"use client";

import { useEffect } from "react";

/** Registers the PWA service worker once on the client. */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration can fail on insecure origins other than localhost - ignore.
    });
  }, []);

  return null;
}
