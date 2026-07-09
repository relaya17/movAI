import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { payments } from "../schema/credits";

/**
 * The payment-provider side of grantPurchasedCredits() (repositories/credits.ts) -
 * previously referenced by a comment there but never actually built, which
 * left apps/web's Stripe webhook (app/api/webhooks/stripe/route.ts) hand-
 * rolling its own duplicate balance/ledger-update logic instead of calling
 * the shared, idempotency-protected repository functions.
 */
export async function markPaymentCompleted(
  db: Database,
  paymentId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await db
    .update(payments)
    .set({ status: "completed", completedAt: new Date(), metadata: JSON.stringify(metadata) })
    .where(eq(payments.id, paymentId));
}

export async function markPaymentExpired(db: Database, paymentId: string): Promise<void> {
  await db.update(payments).set({ status: "expired" }).where(eq(payments.id, paymentId));
}
