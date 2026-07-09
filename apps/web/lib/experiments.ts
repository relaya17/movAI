/**
 * GrowthBook feature flags — optional A/B experiments.
 * Falls back to sane defaults when NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY is unset.
 */

const DEFAULT_RECOMMENDATION_LAMBDA = 0.2;

interface GrowthBookFeatureResponse {
  features?: Record<string, { defaultValue?: unknown }>;
}

let cachedLambda: number | undefined;

export async function getRecommendationLambda(): Promise<number> {
  if (cachedLambda !== undefined) return cachedLambda;

  const clientKey = process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY;
  const apiHost = process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST ?? "https://cdn.growthbook.io";

  if (!clientKey) {
    cachedLambda = DEFAULT_RECOMMENDATION_LAMBDA;
    return cachedLambda;
  }

  try {
    const response = await fetch(`${apiHost}/api/features/${clientKey}`);
    if (!response.ok) {
      cachedLambda = DEFAULT_RECOMMENDATION_LAMBDA;
      return cachedLambda;
    }
    const data = (await response.json()) as GrowthBookFeatureResponse;
    const value = data.features?.recommendation_lambda?.defaultValue;
    cachedLambda = typeof value === "number" && value >= 0 && value <= 1 ? value : DEFAULT_RECOMMENDATION_LAMBDA;
    return cachedLambda;
  } catch {
    cachedLambda = DEFAULT_RECOMMENDATION_LAMBDA;
    return cachedLambda;
  }
}

export function getDefaultRecommendationLambda(): number {
  return DEFAULT_RECOMMENDATION_LAMBDA;
}
