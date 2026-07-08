import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCreditBalance } from "@movai/db";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";
import { BrowsePageClient } from "@/components/dashboard/BrowsePageClient";

export default async function DashboardLayout({ children }: { children: ReactNode }): Promise<React.ReactElement> {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const creditBalance = session.user.id ? await getCreditBalance(db, session.user.id) : 0;

  return (
    <BrowsePageClient>
      <div className="flex min-h-[100dvh] flex-col bg-neutral-950">
        <DashboardNav user={session.user} creditBalance={creditBalance} />
        <main className="flex-1">{children}</main>
        <DashboardFooter />
      </div>
    </BrowsePageClient>
  );
}
