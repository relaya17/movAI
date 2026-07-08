"use server";

import { auth } from "@/auth";
import { db } from "./db";
import {
  giftCatalog,
  giftTransactions,
  creditBalances,
  creditTransactions,
  uploads,
} from "@movai/db";
import { eq, sql, desc } from "drizzle-orm";

/** Creator takes 50% of gift value (industry standard) */
const CREATOR_PAYOUT_RATE = 0.5;

export interface SendGiftResult {
  success: boolean;
  error?: string;
  newBalance?: number;
}

export interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  costInCredits: number;
}

export interface ReceivedGift {
  id: string;
  giftEmoji: string;
  giftName: string;
  senderName: string | null;
  creditsReceived: number;
  uploadTitle: string;
  createdAt: Date;
}

export interface SentGift {
  id: string;
  giftEmoji: string;
  giftName: string;
  recipientName: string | null;
  creditsSpent: number;
  uploadTitle: string;
  createdAt: Date;
}

/**
 * Get all available gift types.
 */
export async function getGiftCatalog(): Promise<GiftItem[]> {
  const gifts = await db
    .select()
    .from(giftCatalog)
    .orderBy(giftCatalog.sortOrder);

  return gifts.map((g) => ({
    id: g.id,
    name: g.name,
    emoji: g.emoji,
    costInCredits: g.costInCredits,
  }));
}

/**
 * Send a gift to a creator on their upload.
 */
export async function sendGift(
  uploadId: string,
  giftId: string
): Promise<SendGiftResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "יש להתחבר כדי לשלוח מתנה" };
  }

  const senderId = session.user.id;

  // Get the gift details
  const [gift] = await db
    .select()
    .from(giftCatalog)
    .where(eq(giftCatalog.id, giftId))
    .limit(1);

  if (!gift) {
    return { success: false, error: "מתנה לא נמצאה" };
  }

  // Get the upload and creator
  const [upload] = await db
    .select()
    .from(uploads)
    .where(eq(uploads.id, uploadId))
    .limit(1);

  if (!upload) {
    return { success: false, error: "תוכן לא נמצא" };
  }

  if (upload.creatorUserId === senderId) {
    return { success: false, error: "לא ניתן לשלוח מתנה לעצמך" };
  }

  if (upload.giftsEnabled !== 1) {
    return { success: false, error: "מתנות לא מופעלות עבור תוכן זה" };
  }

  // Check sender's balance
  const [senderBalance] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, senderId))
    .limit(1);

  if (!senderBalance || senderBalance.balance < gift.costInCredits) {
    return { success: false, error: "אין מספיק קרדיטים" };
  }

  const creditsToCreator = Math.floor(gift.costInCredits * CREATOR_PAYOUT_RATE);

  try {
    // Deduct from sender
    await db
      .update(creditBalances)
      .set({
        balance: sql`${creditBalances.balance} - ${gift.costInCredits}`,
        totalUsed: sql`${creditBalances.totalUsed} + ${gift.costInCredits}`,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, senderId));

    // Get sender's new balance
    const [newSenderBalance] = await db
      .select({ balance: creditBalances.balance })
      .from(creditBalances)
      .where(eq(creditBalances.userId, senderId))
      .limit(1);

    // Log sender transaction
    await db.insert(creditTransactions).values({
      userId: senderId,
      type: "gift",
      amount: -gift.costInCredits,
      balanceAfter: newSenderBalance?.balance ?? 0,
      description: `שליחת מתנה: ${gift.emoji} ${gift.name}`,
      referenceId: uploadId,
    });

    // Ensure creator has a balance record
    const [creatorBalance] = await db
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.userId, upload.creatorUserId))
      .limit(1);

    if (creatorBalance) {
      await db
        .update(creditBalances)
        .set({
          balance: sql`${creditBalances.balance} + ${creditsToCreator}`,
          updatedAt: new Date(),
        })
        .where(eq(creditBalances.userId, upload.creatorUserId));
    } else {
      await db.insert(creditBalances).values({
        userId: upload.creatorUserId,
        balance: creditsToCreator,
        totalPurchased: 0,
        totalUsed: 0,
      });
    }

    // Get creator's new balance for transaction log
    const [newCreatorBalance] = await db
      .select({ balance: creditBalances.balance })
      .from(creditBalances)
      .where(eq(creditBalances.userId, upload.creatorUserId))
      .limit(1);

    // Log creator transaction
    await db.insert(creditTransactions).values({
      userId: upload.creatorUserId,
      type: "gift",
      amount: creditsToCreator,
      balanceAfter: newCreatorBalance?.balance ?? creditsToCreator,
      description: `קבלת מתנה: ${gift.emoji} ${gift.name}`,
      referenceId: uploadId,
    });

    // Record the gift transaction
    await db.insert(giftTransactions).values({
      senderId,
      recipientId: upload.creatorUserId,
      uploadId,
      giftId: gift.id,
      creditsSpent: gift.costInCredits,
      creditsToCreator,
    });

    return {
      success: true,
      newBalance: newSenderBalance?.balance ?? 0,
    };
  } catch (error) {
    console.error("Error sending gift:", error);
    return { success: false, error: "שגיאה בשליחת המתנה" };
  }
}

/**
 * Get gifts received by the current user.
 */
export async function getReceivedGifts(limit = 50): Promise<ReceivedGift[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const gifts = await db
    .select({
      id: giftTransactions.id,
      giftId: giftTransactions.giftId,
      senderId: giftTransactions.senderId,
      creditsReceived: giftTransactions.creditsToCreator,
      uploadId: giftTransactions.uploadId,
      createdAt: giftTransactions.createdAt,
    })
    .from(giftTransactions)
    .where(eq(giftTransactions.recipientId, session.user.id))
    .orderBy(desc(giftTransactions.createdAt))
    .limit(limit);

  // Get gift details and upload titles
  const enrichedGifts: ReceivedGift[] = [];
  for (const gift of gifts) {
    const [giftDetails] = await db
      .select()
      .from(giftCatalog)
      .where(eq(giftCatalog.id, gift.giftId))
      .limit(1);

    const [upload] = await db
      .select({ title: uploads.title })
      .from(uploads)
      .where(eq(uploads.id, gift.uploadId))
      .limit(1);

    enrichedGifts.push({
      id: gift.id,
      giftEmoji: giftDetails?.emoji ?? "🎁",
      giftName: giftDetails?.name ?? "מתנה",
      senderName: null, // Could join with users table if needed
      creditsReceived: gift.creditsReceived,
      uploadTitle: upload?.title ?? "תוכן",
      createdAt: gift.createdAt,
    });
  }

  return enrichedGifts;
}

/**
 * Get total credits received from gifts.
 */
export async function getGiftStats(): Promise<{
  totalReceived: number;
  totalSent: number;
  giftsReceived: number;
  giftsSent: number;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { totalReceived: 0, totalSent: 0, giftsReceived: 0, giftsSent: 0 };
  }

  const received = await db
    .select({
      total: sql<number>`COALESCE(SUM(${giftTransactions.creditsToCreator}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(giftTransactions)
    .where(eq(giftTransactions.recipientId, session.user.id));

  const sent = await db
    .select({
      total: sql<number>`COALESCE(SUM(${giftTransactions.creditsSpent}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(giftTransactions)
    .where(eq(giftTransactions.senderId, session.user.id));

  return {
    totalReceived: Number(received[0]?.total ?? 0),
    totalSent: Number(sent[0]?.total ?? 0),
    giftsReceived: Number(received[0]?.count ?? 0),
    giftsSent: Number(sent[0]?.count ?? 0),
  };
}
