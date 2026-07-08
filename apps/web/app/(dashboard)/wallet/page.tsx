import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { creditBalances, creditTransactions } from "@movai/db";
import { eq, desc } from "drizzle-orm";
import { getGiftStats, getReceivedGifts } from "@/lib/gift-actions";
import { WalletClient } from "@/components/wallet/WalletClient";

export const metadata = {
  title: "ארנק מתנות | MoVAI",
  description: "צפה במתנות שקיבלת והיסטוריית הקרדיטים שלך",
};

export default async function WalletPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Get balance
  const [balance] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, session.user.id))
    .limit(1);

  // Get recent transactions
  const transactions = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, session.user.id))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(20);

  // Get gift stats
  const giftStats = await getGiftStats();

  // Get received gifts
  const receivedGifts = await getReceivedGifts(10);

  return (
    <WalletClient
      balance={balance?.balance ?? 0}
      totalPurchased={balance?.totalPurchased ?? 0}
      totalUsed={balance?.totalUsed ?? 0}
      transactions={transactions}
      giftStats={giftStats}
      receivedGifts={receivedGifts}
    />
  );
}
