import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCreditBalance } from "@movai/db";
import { StudioTabs } from "@/components/studio/StudioTabs";

export const metadata: Metadata = {
  title: "סטודיו AI",
  description: "צרו וידאו, מוזיקה ושירה באמצעות בינה מלאכותית",
};

export default async function StudioPage(): Promise<React.ReactElement> {
  const t = await getTranslations("studio");
  const session = await auth();
  const creditBalance = session?.user?.id ? await getCreditBalance(db, session.user.id) : 0;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-orbitron text-3xl font-bold tracking-wide text-white sm:text-4xl">
            {t("pageHeading")}{" "}
            <span
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #67e8f9 50%, #06b6d4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI
            </span>
          </h1>
          <p className="mt-2 text-neutral-400">{t("pageSubtitle")}</p>
        </div>

        {/* Credit balance - every generation is charged against this, no separate monthly quota */}
        <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-neutral-500">{t("usage.creditBalance")}</p>
              <p className="text-lg font-semibold text-white">💰 {creditBalance.toLocaleString()}</p>
            </div>
            <Link
              href="/pricing"
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-400"
            >
              {t("usage.buyMore")}
            </Link>
          </div>
        </div>

        {/* Studio Tabs */}
        <StudioTabs />
      </div>
    </div>
  );
}
