import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { listActivePlans, getActiveSubscription } from "@movai/db";
import { SubscriptionClient } from "@/components/pricing/SubscriptionClient";

export const metadata = {
  title: "מנוי פרימיום | MoVAI",
  description: "קרדיטים והטבות ל-Studio - הקטלוג נשאר חינמי לכולם"
};

export default async function SubscriptionPricingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [plans, active] = await Promise.all([listActivePlans(db), getActiveSubscription(db, session.user.id)]);

  return (
    <SubscriptionClient
      plans={plans.map((p) => ({
        id: p.id,
        interval: p.interval,
        name: p.name,
        priceNis: p.priceNis,
        creditsPerPeriod: p.creditsPerPeriod,
        adFree: p.adFree,
        priorityQueue: p.priorityQueue,
        earlyAccess: p.earlyAccess,
        founderBadge: p.founderBadge
      }))}
      active={
        active
          ? {
              planName: active.plan.name,
              currentPeriodEnd: active.subscription.currentPeriodEnd?.toISOString() ?? null,
              cancelAtPeriodEnd: active.subscription.cancelAtPeriodEnd
            }
          : null
      }
    />
  );
}
