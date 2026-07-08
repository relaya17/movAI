import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { creditPackages, creditBalances } from "@movai/db";
import { eq } from "drizzle-orm";
import { PricingClient } from "@/components/pricing/PricingClient";

export const metadata = {
  title: "קנה קרדיטים | MoVAI",
  description: "רכוש קרדיטים ליצירת תוכן AI",
};

export default async function PricingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Get packages
  const packages = await db
    .select()
    .from(creditPackages)
    .where(eq(creditPackages.isActive, 1))
    .orderBy(creditPackages.sortOrder);

  // Get user's current balance
  const [balance] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, session.user.id))
    .limit(1);

  return (
    <PricingClient
      packages={packages}
      currentBalance={balance?.balance ?? 0}
    />
  );
}
