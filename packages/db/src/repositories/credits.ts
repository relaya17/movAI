import { and, eq, sql } from "drizzle-orm";
import type { Database, Transaction } from "../client";
import { creditBalances, creditTransactions, giftCatalog, giftTransactions, uploads } from "../schema/index";
import { SIGNUP_BONUS_CREDITS } from "@movai/types";

/**
 * Share of a gift's credit value that reaches the creator, matching the
 * industry-standard take rate for gifting/tipping platforms (TikTok LIVE
 * Gifts pays creators ~50% of a gift's coin value after the platform's
 * cut - https://captions.ai/blog/tiktok-gifts-value). Kept as a named
 * constant rather than a magic number so the business rule is visible and
 * changeable in one place.
 */
export const CREATOR_PAYOUT_RATE = 0.5;

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly userId: string,
    public readonly required: number,
    public readonly available: number
  ) {
    super(`User ${userId} has ${available} credits, needs ${required}`);
    this.name = "InsufficientCreditsError";
  }
}

export class GiftNotFoundError extends Error {
  constructor(public readonly giftId: string) {
    super(`Gift "${giftId}" is not in the catalog`);
    this.name = "GiftNotFoundError";
  }
}

export class UploadNotFoundError extends Error {
  constructor(public readonly uploadId: string) {
    super(`Upload "${uploadId}" does not exist`);
    this.name = "UploadNotFoundError";
  }
}

export async function getCreditBalance(db: Database, userId: string): Promise<number> {
  const [row] = await db
    .select({ balance: creditBalances.balance })
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);
  return row?.balance ?? 0;
}

export async function getGiftCatalog(db: Database) {
  return db.select().from(giftCatalog).orderBy(giftCatalog.sortOrder);
}

/**
 * Adds (or removes, if `amount` is negative) credits for a user and logs
 * the ledger entry - both writes happen in the caller's transaction so a
 * crash between them is impossible. `FOR UPDATE` on the balance row
 * prevents a lost update if two grants/spends for the same user race each
 * other (e.g. two gifts sent back-to-back).
 *
 * Callers are responsible for checking sufficient balance *before* calling
 * this with a negative amount if the operation should never go negative -
 * this function itself does not enforce non-negative balances, since some
 * legitimate flows (refunds, admin adjustments) intentionally bypass that
 * check. `sendGift` below is the enforced path for spending.
 */
async function applyCreditDelta(
  tx: Transaction,
  userId: string,
  amount: number,
  type: "signup_bonus" | "purchase" | "usage" | "refund" | "gift" | "promo" | "subscription",
  description: string,
  referenceId?: string
): Promise<number> {
  await tx
    .insert(creditBalances)
    .values({ userId, balance: 0 })
    .onConflictDoNothing({ target: creditBalances.userId });

  const [locked] = await tx
    .select({ balance: creditBalances.balance })
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .for("update");

  const currentBalance = locked?.balance ?? 0;
  const newBalance = currentBalance + amount;

  await tx
    .update(creditBalances)
    .set({
      balance: newBalance,
      updatedAt: new Date(),
      ...(amount > 0 ? { totalPurchased: sql`${creditBalances.totalPurchased} + ${amount}` } : {}),
      ...(amount < 0 ? { totalUsed: sql`${creditBalances.totalUsed} + ${-amount}` } : {})
    })
    .where(eq(creditBalances.userId, userId));

  await tx.insert(creditTransactions).values({
    userId,
    type,
    amount,
    balanceAfter: newBalance,
    description,
    referenceId: referenceId ?? null
  });

  return newBalance;
}

/** Promo / referral / admin adjustments — idempotent when referenceId is unique per grant. */
export async function grantPromoCredits(
  db: Database,
  userId: string,
  amount: number,
  description: string,
  referenceId: string
): Promise<number> {
  return db.transaction((tx) => applyCreditDelta(tx, userId, amount, "promo", description, referenceId));
}

/** One-time welcome credits on first account creation. Idempotent via referenceId. */
export async function grantSignupBonus(db: Database, userId: string): Promise<number | null> {
  const [existing] = await db
    .select({ id: creditTransactions.id })
    .from(creditTransactions)
    .where(and(eq(creditTransactions.userId, userId), eq(creditTransactions.type, "signup_bonus")))
    .limit(1);

  if (existing) return null;

  return db.transaction((tx) =>
    applyCreditDelta(tx, userId, SIGNUP_BONUS_CREDITS, "signup_bonus", "מתנת הצטרפות לסטודיו", `signup:${userId}`)
  );
}

/** Credits a purchase (from a completed payment) - see repositories/payments.ts for the payment-provider side. */
export async function grantPurchasedCredits(
  db: Database,
  userId: string,
  amount: number,
  paymentId: string
): Promise<number> {
  return db.transaction((tx) => applyCreditDelta(tx, userId, amount, "purchase", `רכישת ${amount} קרדיטים`, paymentId));
}

/**
 * Credits a subscription's per-period allotment (see repositories/subscriptions.ts).
 * `referenceId` must be unique per billing period for the SAME subscription
 * (e.g. `${stripeSubscriptionId}:${currentPeriodStart.toISOString()}`) - the
 * (userId, referenceId, type) unique index is what makes this idempotent
 * against Stripe redelivering the same "invoice paid" webhook event: a
 * second attempt to grant the *same* period's credits throws a unique
 * violation instead of double-crediting the user.
 */
export async function grantSubscriptionCredits(
  db: Database,
  userId: string,
  amount: number,
  periodReferenceId: string
): Promise<number> {
  return db.transaction((tx) =>
    applyCreditDelta(tx, userId, amount, "subscription", `קרדיטים ממנוי - ${amount}`, periodReferenceId)
  );
}

/**
 * The enforced spend path for non-gift usage (AI Studio generations, etc.):
 * checks the balance *inside* the transaction with the same `FOR UPDATE`
 * locking `sendGift` uses, so two generations kicked off back-to-back can't
 * both read a stale balance and both succeed when only one should. Throws
 * `InsufficientCreditsError` instead of silently going negative.
 */
export async function spendCredits(
  db: Database,
  userId: string,
  amount: number,
  description: string,
  referenceId?: string
): Promise<number> {
  if (amount <= 0) throw new Error(`spendCredits amount must be positive, got ${amount}`);

  return db.transaction(async (tx) => {
    await tx.insert(creditBalances).values({ userId, balance: 0 }).onConflictDoNothing({ target: creditBalances.userId });

    const [locked] = await tx
      .select({ balance: creditBalances.balance })
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId))
      .for("update");
    const currentBalance = locked?.balance ?? 0;

    if (currentBalance < amount) {
      throw new InsufficientCreditsError(userId, amount, currentBalance);
    }

    return applyCreditDelta(tx, userId, -amount, "usage", description, referenceId);
  });
}

/** Reverses a `spendCredits` call (e.g. the generation the credits paid for failed on the provider's side). */
export async function refundCredits(db: Database, userId: string, amount: number, description: string, referenceId?: string): Promise<number> {
  if (amount <= 0) throw new Error(`refundCredits amount must be positive, got ${amount}`);
  return db.transaction((tx) => applyCreditDelta(tx, userId, amount, "refund", description, referenceId));
}

export interface SendGiftInput {
  senderId: string;
  uploadId: string;
  giftId: string;
}

export interface SendGiftResult {
  giftTransactionId: string;
  senderBalanceAfter: number;
  creditsSpent: number;
  creditsToCreator: number;
}

/**
 * The enforced spend path: verifies the sender can actually afford the
 * gift *inside* the transaction (not before it - a check-then-act gap
 * outside the transaction would allow a double-spend from two concurrent
 * requests), then atomically debits the sender, credits the recipient
 * their cut, and records the gift itself. All four writes commit together
 * or not at all.
 */
export async function sendGift(db: Database, input: SendGiftInput): Promise<SendGiftResult> {
  const [gift] = await db.select().from(giftCatalog).where(eq(giftCatalog.id, input.giftId)).limit(1);
  if (!gift) throw new GiftNotFoundError(input.giftId);

  const [upload] = await db.select().from(uploads).where(eq(uploads.id, input.uploadId)).limit(1);
  if (!upload) throw new UploadNotFoundError(input.uploadId);

  const creditsToCreator = Math.round(gift.costInCredits * CREATOR_PAYOUT_RATE);

  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ balance: creditBalances.balance })
      .from(creditBalances)
      .where(eq(creditBalances.userId, input.senderId))
      .for("update");
    const senderBalance = locked?.balance ?? 0;

    if (senderBalance < gift.costInCredits) {
      throw new InsufficientCreditsError(input.senderId, gift.costInCredits, senderBalance);
    }

    const [giftTransaction] = await tx
      .insert(giftTransactions)
      .values({
        senderId: input.senderId,
        recipientId: upload.creatorUserId,
        uploadId: input.uploadId,
        giftId: input.giftId,
        creditsSpent: gift.costInCredits,
        creditsToCreator
      })
      .returning({ id: giftTransactions.id });

    if (!giftTransaction) {
      throw new Error("Failed to record gift transaction");
    }

    const senderBalanceAfter = await applyCreditDelta(
      tx,
      input.senderId,
      -gift.costInCredits,
      "gift",
      `שלחת ${gift.emoji} ${gift.name}`,
      giftTransaction.id
    );

    await applyCreditDelta(tx, upload.creatorUserId, creditsToCreator, "gift", `קיבלת ${gift.emoji} ${gift.name}`, giftTransaction.id);

    return {
      giftTransactionId: giftTransaction.id,
      senderBalanceAfter,
      creditsSpent: gift.costInCredits,
      creditsToCreator
    };
  });
}
