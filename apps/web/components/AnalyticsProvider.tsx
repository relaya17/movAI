"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function AnalyticsProvider(): null {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === "undefined") return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage+cookie"
    });
  }, []);

  return null;
}

/** Client-side product events (Studio, watchlist, etc.). */
export function trackClientEvent(event: string, properties?: Record<string, string | number | boolean>): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.capture(event, properties);
}
