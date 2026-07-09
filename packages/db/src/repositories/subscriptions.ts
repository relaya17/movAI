import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { subscriptionPlans, userSubscriptions, subscriptionIntervalEnum } from "../schema/subscriptions";
import { isUniqueViolation } from "../errors";

export type SubscriptionInterval = (typeof subscriptionIntervalEnum.enumValues)[number];

export async function listActivePlans(db: Database) {
  return db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, 1))
    .orderBy(subscriptionPlans.sortOrder);
}

export async function getPlanByInterval(db: Database, interval: SubscriptionInterval) {
  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.interval, interval)).limit(1);
  return plan;
}

export async function getPlanById(db: Database, planId: string) {
  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
  return plan;
}

/**
 * A user's currently active subscription, joined with its plan (so callers
 * checking perks - adFree/priorityQueue/earlyAccess - never need a second
 * query). Returns undefined for free users, exactly like `getBalance`
 * returning 0 for a user with no credit history - "no subscription" is a
 * normal state, not an error.
 */
export async function getActiveSubscription(db: Database, userId: string) {
  const [row] = await db
    .select({ subscription: userSubscriptions, plan: subscriptionPlans })
    .from(userSubscriptions)
    .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
    .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active")))
    .limit(1);
  return row;
}

export async function hasActiveSubscription(db: Database, userId: string): Promise<boolean> {
  const active = await getActiveSubscription(db, userId);
  return active !== undefined;
}

export interface UpsertSubscriptionInput {
  userId: string;
  planId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: "active" | "canceled" | "past_due" | "incomplete";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Idempotent create-or-update keyed on `stripeSubscriptionId` (unique) -
 * every Stripe webhook event for a given subscription (created, renewed,
 * canceled) calls this, and Stripe redelivers events, so the same event
 * arriving twice must land on the same row, not create a duplicate.
 *
 * If this insert would violate the "one active subscription per user"
 * partial index (e.g. a stale webhook for an old subscription arrives after
 * a newer one is already active), it's treated the same way
 * addCredits/useCredits treat a duplicate-idempotency-key violation
 * elsewhere in this codebase: log and return the row that's actually
 * active, rather than throwing and failing the whole webhook delivery.
 */
export async function upsertSubscriptionFromStripe(db: Database, input: UpsertSubscriptionInput) {
  try {
    const [row] = await db
      .insert(userSubscriptions)
      .values({
        userId: input.userId,
        planId: input.planId,
        status: input.status,
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd
      })
      .onConflictDoUpdate({
        target: userSubscriptions.stripeSubscriptionId,
        set: {
          status: input.status,
          currentPeriodStart: input.currentPeriodStart,
          currentPeriodEnd: input.currentPeriodEnd,
          cancelAtPeriodEnd: input.cancelAtPeriodEnd,
          updatedAt: new Date()
        }
      })
      .returning();
    return row;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return getActiveSubscription(db, input.userId).then((active) => active?.subscription);
    }
    throw error;
  }
}

/** Most recent subscription row for a user regardless of status - for account/billing history pages. */
export async function listSubscriptionHistory(db: Database, userId: string) {
  return db
    .select({ subscription: userSubscriptions, plan: subscriptionPlans })
    .from(userSubscriptions)
    .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
    .where(eq(userSubscriptions.userId, userId))
    .orderBy(desc(userSubscriptions.createdAt));
}
