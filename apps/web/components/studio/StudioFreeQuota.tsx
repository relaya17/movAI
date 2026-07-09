import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCreditBalance, getFreeCreationsRemaining } from "@movai/db";
import { MONTHLY_FREE_CREATIONS } from "@movai/types";

export async function StudioFreeQuota(): Promise<React.ReactElement | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("studio.quota");
  const [freeRemaining, creditBalance] = await Promise.all([
    getFreeCreationsRemaining(db, session.user.id),
    getCreditBalance(db, session.user.id),
  ]);

  return (
    <p className="mb-4 text-center text-sm text-neutral-400">
      {freeRemaining > 0
        ? t("freeRemaining", { count: freeRemaining, total: MONTHLY_FREE_CREATIONS })
        : t("creditsOnly", { balance: creditBalance.toLocaleString("he-IL") })}
    </p>
  );
}
