import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCreditBalance, getActiveSubscription, users } from "@movai/db";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { SponsorBanner } from "@/components/dashboard/SponsorBanner";

export default async function DashboardLayout({ children }: { children: ReactNode }): Promise<React.ReactElement> {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const userId = session.user.id;
  const [creditBalance, activeSubscription, userRows] = await Promise.all([
    userId ? getCreditBalance(db, userId) : Promise.resolve(0),
    userId ? getActiveSubscription(db, userId) : Promise.resolve(undefined),
    userId
      ? db
          .select({ emailVerified: users.emailVerified, passwordHash: users.passwordHash })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
      : Promise.resolve([])
  ]);

  // Sponsor banner (the "ad") is the one thing an ad-free subscription
  // actually removes - every other browse-page category stays identical
  // for free and paying users (see the earlier catalog-paywall discussion:
  // the free catalog itself is never gated).
  const showSponsorBanner = !activeSubscription?.plan.adFree;

  const userRow = userRows[0];
  const showVerificationBanner = Boolean(userRow?.passwordHash) && !userRow?.emailVerified;

  const pathname = (await headers()).get("x-pathname") ?? "";
  const hideFooter = pathname.startsWith("/studio");

  return (
    <div className="flex min-h-[100dvh] flex-col bg-neutral-950">
      {showVerificationBanner && <EmailVerificationBanner />}
      <DashboardNav user={session.user} creditBalance={creditBalance} founderBadge={activeSubscription?.plan.founderBadge ?? false} />
      <main className="relative flex-1 overflow-x-hidden overflow-y-visible">
        {showSponsorBanner && <SponsorBanner />}
        {children}
      </main>
      {!hideFooter && <DashboardFooter />}
    </div>
  );
}
