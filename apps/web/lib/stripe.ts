import Stripe from "stripe";

/** Thrown when Stripe is used without STRIPE_SECRET_KEY configured. */
export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe is not configured (missing STRIPE_SECRET_KEY)");
    this.name = "StripeNotConfiguredError";
  }
}

let cachedClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeNotConfiguredError();
  if (!cachedClient) {
    cachedClient = new Stripe(key, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return cachedClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
