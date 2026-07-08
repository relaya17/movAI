import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { eq, desc, and, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  creditBalances,
  creditTransactions,
  creditPackages,
  users,
} from "@movai/db";
import { DATABASE } from "../infra/tokens";

/** Signup bonus credits */
const SIGNUP_BONUS_CREDITS = 10;

/** Credit value in NIS */
export const CREDIT_VALUE_NIS = 0.5;

/** Credit costs for different creation types */
export const CREATION_COSTS = {
  music_short: 1, // 30 seconds
  music_long: 2, // 60 seconds
  video_15s: 6,
  video_30s: 12,
  video_60s: 24,
  voice_1k: 1, // 1000 characters
} as const;

/** Simplified costs for AI creation types (average) */
export const AI_CREATION_COSTS = {
  video: 12, // Average for 30s video
  music: 2, // 60 seconds track
  voice: 1, // 1000 characters
} as const;

export interface CreditBalance {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
}

export interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: Date;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceNis: string;
  priceUsd: string;
  bonusCredits: number;
}

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

  /**
   * Get user's current credit balance, creating one if it doesn't exist.
   */
  async getBalance(userId: string): Promise<CreditBalance> {
    const [balance] = await this.db
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId))
      .limit(1);

    if (balance) {
      return {
        balance: balance.balance,
        totalPurchased: balance.totalPurchased,
        totalUsed: balance.totalUsed,
      };
    }

    // Create new balance record with signup bonus
    return this.initializeUserCredits(userId);
  }

  /**
   * Initialize credits for a new user with signup bonus.
   */
  async initializeUserCredits(userId: string): Promise<CreditBalance> {
    // Check if user exists
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if already initialized
    const [existing] = await this.db
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId))
      .limit(1);

    if (existing) {
      return {
        balance: existing.balance,
        totalPurchased: existing.totalPurchased,
        totalUsed: existing.totalUsed,
      };
    }

    // Create balance with signup bonus
    await this.db.insert(creditBalances).values({
      userId,
      balance: SIGNUP_BONUS_CREDITS,
      totalPurchased: 0,
      totalUsed: 0,
    });

    // Log the transaction
    await this.db.insert(creditTransactions).values({
      userId,
      type: "signup_bonus",
      amount: SIGNUP_BONUS_CREDITS,
      balanceAfter: SIGNUP_BONUS_CREDITS,
      description: "בונוס הרשמה",
    });

    return {
      balance: SIGNUP_BONUS_CREDITS,
      totalPurchased: 0,
      totalUsed: 0,
    };
  }

  /**
   * Add credits to user's balance (purchase, gift, promo).
   */
  async addCredits(
    userId: string,
    amount: number,
    type: "purchase" | "gift" | "promo" | "refund",
    description?: string,
    referenceId?: string
  ): Promise<CreditBalance> {
    if (amount <= 0) {
      throw new BadRequestException("Amount must be positive");
    }

    // Ensure user has a balance record
    await this.getBalance(userId);

    try {
      // Balance update + ledger insert commit together - previously these
      // were two separate statements outside a transaction, so a crash
      // between them (or the unique-violation catch below) could leave the
      // balance changed with no ledger row to explain it.
      return await this.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(creditBalances)
          .set({
            balance: sql`${creditBalances.balance} + ${amount}`,
            totalPurchased:
              type === "purchase"
                ? sql`${creditBalances.totalPurchased} + ${amount}`
                : creditBalances.totalPurchased,
            updatedAt: new Date(),
          })
          .where(eq(creditBalances.userId, userId))
          .returning();

        if (!updated) {
          throw new Error("Failed to update credit balance");
        }

        // `referenceId` + `type` is unique (schema/credits.ts) - this insert
        // is the idempotency check itself. A second attempt to apply the
        // same referenceId+type (e.g. a BullMQ retry re-running the refund
        // for a creation that was already refunded) throws a unique
        // violation here, which rolls back the balance update above too -
        // so a duplicate refund never partially applies.
        await tx.insert(creditTransactions).values({
          userId,
          type,
          amount,
          balanceAfter: updated.balance,
          description,
          referenceId,
        });

        return {
          balance: updated.balance,
          totalPurchased: updated.totalPurchased,
          totalUsed: updated.totalUsed,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        this.logger.warn(
          `addCredits: ${type} for referenceId=${referenceId ?? "none"} (user ${userId}) was already applied - skipping duplicate`
        );
        return this.getBalance(userId);
      }
      throw error;
    }
  }

  /**
   * Use credits for a creation. Returns false if insufficient balance.
   */
  async useCredits(
    userId: string,
    amount: number,
    description?: string,
    referenceId?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    if (amount <= 0) {
      throw new BadRequestException("Amount must be positive");
    }

    const balance = await this.getBalance(userId);

    if (balance.balance < amount) {
      return { success: false, newBalance: balance.balance };
    }

    try {
      return await this.db.transaction(async (tx) => {
        // Update balance atomically with check
        const [updated] = await tx
          .update(creditBalances)
          .set({
            balance: sql`${creditBalances.balance} - ${amount}`,
            totalUsed: sql`${creditBalances.totalUsed} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(creditBalances.userId, userId),
              sql`${creditBalances.balance} >= ${amount}`
            )
          )
          .returning();

        if (!updated) {
          // Race condition - balance changed
          return { success: false, newBalance: balance.balance };
        }

        const newBalance = updated.balance;

        // Log transaction - referenceId+type unique constraint makes a
        // duplicate spend attempt (e.g. a double-submitted generation
        // request reusing the same referenceId) fail here and roll back
        // the debit above, instead of charging the user twice.
        await tx.insert(creditTransactions).values({
          userId,
          type: "usage",
          amount: -amount,
          balanceAfter: newBalance,
          description,
          referenceId,
        });

        return { success: true, newBalance };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        this.logger.warn(
          `useCredits: usage for referenceId=${referenceId ?? "none"} (user ${userId}) was already applied - skipping duplicate charge`
        );
        return { success: true, newBalance: (await this.getBalance(userId)).balance };
      }
      throw error;
    }
  }

  /**
   * Check if user has enough credits for a creation.
   */
  async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance.balance >= amount;
  }

  /**
   * Get user's transaction history.
   */
  async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<CreditTransaction[]> {
    const transactions = await this.db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    return transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Get available credit packages.
   */
  async getPackages(): Promise<CreditPackage[]> {
    const packages = await this.db
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.isActive, 1))
      .orderBy(creditPackages.sortOrder);

    return packages.map((p) => ({
      id: p.id,
      name: p.name,
      credits: p.credits,
      priceNis: p.priceNis,
      priceUsd: p.priceUsd,
      bonusCredits: p.bonusCredits,
    }));
  }
}

/**
 * postgres.js (the driver behind drizzle-orm/postgres-js) surfaces a
 * Postgres error's SQLSTATE as `.code` on the thrown error object.
 * "23505" is `unique_violation` - the only error this file ever expects to
 * intentionally hit is the `credit_transactions_reference_type_unique`
 * index added specifically as an idempotency guard, so any 23505 here is
 * treated as "this exact operation already happened," not a real failure.
 */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "23505";
}
