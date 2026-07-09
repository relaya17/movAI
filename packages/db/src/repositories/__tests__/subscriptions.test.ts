import { describe, expect, it, vi } from "vitest";
import type { Database } from "../../client";
import { upsertSubscriptionFromStripe, type UpsertSubscriptionInput } from "../subscriptions";

class FakeUniqueViolation extends Error {
  code = "23505";
}

const BASE_INPUT: UpsertSubscriptionInput = {
  userId: "user-1",
  planId: "plan-monthly",
  stripeCustomerId: "cus_123",
  stripeSubscriptionId: "sub_123",
  status: "active",
  currentPeriodStart: new Date("2026-07-01T00:00:00Z"),
  currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
  cancelAtPeriodEnd: false
};

/**
 * Fakes the two query shapes upsertSubscriptionFromStripe() uses:
 * - db.insert(userSubscriptions).values({...}).onConflictDoUpdate({...}).returning()
 * - (on unique violation) db.select().from().innerJoin().where().limit() -> getActiveSubscription's fallback read
 */
function createFakeDb(options: { insertShouldThrow?: unknown; insertedRow?: Record<string, unknown>; activeRowOnFallback?: unknown }) {
  const insert = vi.fn(() => ({
    values: () => ({
      onConflictDoUpdate: () => ({
        returning: async () => {
          if (options.insertShouldThrow) throw options.insertShouldThrow;
          return [options.insertedRow ?? { id: "row-1", ...BASE_INPUT }];
        }
      })
    })
  }));

  const select = vi.fn(() => ({
    from: () => ({
      innerJoin: () => ({
        where: () => ({
          limit: async () => (options.activeRowOnFallback ? [options.activeRowOnFallback] : [])
        })
      })
    })
  }));

  const db = { insert, select } as unknown as Database;
  return db;
}

describe("upsertSubscriptionFromStripe", () => {
  it("creates/updates the row normally on the first attempt", async () => {
    const db = createFakeDb({ insertedRow: { id: "row-1", ...BASE_INPUT } });

    const row = await upsertSubscriptionFromStripe(db, BASE_INPUT);

    expect(row).toMatchObject({ id: "row-1" });
  });

  it("falls back to the existing active subscription instead of throwing when the 'one active per user' index is violated", async () => {
    const activePlan = { id: "plan-x" };
    const activeSubRow = { id: "row-existing", userId: "user-1", status: "active" };
    const db = createFakeDb({
      insertShouldThrow: new FakeUniqueViolation(),
      activeRowOnFallback: { subscription: activeSubRow, plan: activePlan }
    });

    const row = await upsertSubscriptionFromStripe(db, BASE_INPUT);

    expect(row).toEqual(activeSubRow);
  });

  it("still throws for a genuine, non-idempotency database error", async () => {
    const db = createFakeDb({ insertShouldThrow: new Error("connection terminated unexpectedly") });

    await expect(upsertSubscriptionFromStripe(db, BASE_INPUT)).rejects.toThrow("connection terminated unexpectedly");
  });
});
