/**
 * Seed the 4 subscription tiers (daily/weekly/monthly/yearly) and, if
 * STRIPE_SECRET_KEY is set, create a matching Stripe Product + recurring
 * Price for each so subscription-actions.ts has a real stripePriceId to
 * check out against. Safe to re-run - existing plan rows are left alone
 * (onConflictDoNothing on the unique `interval` column) and Stripe
 * Price/Product creation is skipped for any plan that already has one.
 *
 * Run: pnpm --filter @movai/web seed:subscription-plans
 *
 * Pricing (agreed 2026-07-09): kept deliberately close to what a single
 * existing credit package already costs a la carte (see
 * seed-credit-packages.ts - 50 credits/25 NIS) rather than steeply
 * discounting credits, so the subscription's real value is the *perks*
 * (ad-free, priority queue, early access), not undercutting the existing
 * one-time packages. The yearly tier's `creditsPerPeriod` is a full year's
 * worth (50/month * 12) granted as one lump sum when the annual invoice is
 * paid - Stripe only fires one invoice per year for a "yearly" interval
 * subscription, there's no native monthly drip within it.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import Stripe from "stripe";
import { subscriptionPlans } from "@movai/db";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://movai:movai@localhost:5433/movai";

const PLANS = [
  {
    interval: "daily" as const,
    name: "יומי",
    priceNis: "4.00",
    creditsPerPeriod: 0,
    adFree: true,
    priorityQueue: false,
    earlyAccess: false,
    founderBadge: false,
    stripeInterval: "day" as const,
    sortOrder: 1
  },
  {
    interval: "weekly" as const,
    name: "שבועי",
    priceNis: "10.00",
    creditsPerPeriod: 15,
    adFree: true,
    priorityQueue: true,
    earlyAccess: false,
    founderBadge: false,
    stripeInterval: "week" as const,
    sortOrder: 2
  },
  {
    interval: "monthly" as const,
    name: "חודשי",
    priceNis: "25.00",
    creditsPerPeriod: 50,
    adFree: true,
    priorityQueue: true,
    earlyAccess: true,
    founderBadge: false,
    stripeInterval: "month" as const,
    sortOrder: 3
  },
  {
    interval: "yearly" as const,
    name: "שנתי",
    priceNis: "250.00",
    creditsPerPeriod: 600, // 50/month equivalent, granted as one lump sum per annual invoice
    adFree: true,
    priorityQueue: true,
    earlyAccess: true,
    founderBadge: true,
    stripeInterval: "year" as const,
    sortOrder: 4
  }
];

async function seed() {
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);
  const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-06-24.dahlia", typescript: true })
    : undefined;

  if (!stripe) {
    console.warn("STRIPE_SECRET_KEY not set - plans will be seeded without a stripePriceId (not purchasable until set and re-run).");
  }

  console.log("Seeding subscription plans...");

  for (const plan of PLANS) {
    await db
      .insert(subscriptionPlans)
      .values({
        interval: plan.interval,
        name: plan.name,
        priceNis: plan.priceNis,
        creditsPerPeriod: plan.creditsPerPeriod,
        adFree: plan.adFree,
        priorityQueue: plan.priorityQueue,
        earlyAccess: plan.earlyAccess,
        founderBadge: plan.founderBadge,
        sortOrder: plan.sortOrder,
        isActive: 1
      })
      .onConflictDoNothing({ target: subscriptionPlans.interval });

    const [row] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.interval, plan.interval)).limit(1);

    if (stripe && row && !row.stripePriceId) {
      const product = await stripe.products.create({ name: `MoVAI - מנוי ${plan.name}` });
      const price = await stripe.prices.create({
        product: product.id,
        currency: "ils",
        unit_amount: Math.round(Number.parseFloat(plan.priceNis) * 100),
        recurring: { interval: plan.stripeInterval }
      });
      await db.update(subscriptionPlans).set({ stripePriceId: price.id }).where(eq(subscriptionPlans.id, row.id));
      console.log(`  ✓ ${plan.name}: ₪${plan.priceNis}/${plan.stripeInterval} - Stripe price ${price.id}`);
    } else {
      console.log(`  ✓ ${plan.name}: ₪${plan.priceNis}/${plan.stripeInterval}${row?.stripePriceId ? " (Stripe price already set)" : " (no Stripe price - STRIPE_SECRET_KEY not set)"}`);
    }
  }

  console.log("\nDone!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
