/**
 * MoVAI startup economics — single source of truth for pricing math.
 * Credit retail: ~₪0.50/credit (50 credits / ₪25 "בייסיק" package).
 */

/** Free AI creations per calendar month (any type). */
export const MONTHLY_FREE_CREATIONS = 3;

/** One-time credits granted on signup (≈ 1 music + buffer). */
export const SIGNUP_BONUS_CREDITS = 10;

/** Retail price per credit in agorot (₪0.50). */
export const RETAIL_NIS_PER_CREDIT = 0.5;

/** Estimated provider cost per credit in USD (Replicate avg; tune from apiCostUsd logs). */
export const ESTIMATED_PROVIDER_USD_PER_CREDIT = 0.03;

/** Studio generation costs (must match ai-studio-actions.ts). */
export const CREDIT_COSTS = {
  music: 2,
  voicePer1kChars: 1,
  videoPer30s: 12,
} as const;

export const INVESTOR_PITCH_HE =
  "MoVAI — הפלטפורמה הישראלית שבה יוצרים מגלים תוכן חוקי בחינם ויוצרים ממנו וידאו, מוזיקה וקול עם AI.";

export const INVESTOR_PITCH_EN =
  "MoVAI — the Israeli platform where creators discover legal free content and turn it into video, music, and voice with AI.";

/** Example unit economics for a monthly subscriber (₪25, 50 credits). */
export function monthlySubscriberEconomics(creditsUsed = 50) {
  const revenueNis = 25;
  const creditRetailValueNis = creditsUsed * RETAIL_NIS_PER_CREDIT;
  const estimatedCostUsd = creditsUsed * ESTIMATED_PROVIDER_USD_PER_CREDIT;
  const grossMarginNis = revenueNis - creditRetailValueNis * 0.5; // rough 50% COGS on credits
  return { revenueNis, creditRetailValueNis, estimatedCostUsd, grossMarginNis };
}
