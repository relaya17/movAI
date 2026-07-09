/**
 * Product analytics — PostHog (optional).
 * No-ops when NEXT_PUBLIC_POSTHOG_KEY is unset so local dev stays quiet.
 */

type EventProperties = Record<string, string | number | boolean | undefined>;

export function isAnalyticsEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

/** Server-side event capture (concierge, recommendations). */
export async function trackServerEvent(event: string, properties?: EventProperties): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!key) return;

  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        properties: { ...properties, $lib: "movai-server" },
        distinct_id: "server"
      })
    });
  } catch {
    // Analytics must never break product flows.
  }
}
