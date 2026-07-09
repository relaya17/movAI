import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminUser } from "@/lib/admin";
import { getAdminStats, getContentTypeBreakdown } from "@movai/db";

export const metadata = {
  title: "נתונים | MoVAI"
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  movie: "סרטים",
  standup: "סטנדאפ",
  music: "מוזיקה",
  singing: "שירה"
};

/**
 * Plain COUNT queries over existing tables, not a third-party analytics
 * account - no extra vendor, no data leaving the app, immediately useful
 * for a single-operator startup asking "is this actually working?".
 * Same 404-not-redirect admin gate as /admin/sponsors.
 */
export default async function AdminStatsPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!isAdminUser(session?.user?.email)) {
    notFound();
  }

  const [stats, breakdown] = await Promise.all([getAdminStats(db), getContentTypeBreakdown(db)]);

  const CARDS: { label: string; value: number }[] = [
    { label: "משתמשים רשומים", value: stats.totalUsers },
    { label: "סרטים בקטלוג", value: stats.totalMovies },
    { label: "העלאות יוצרים (סה\"כ)", value: stats.totalUploads },
    { label: "העלאות שפורסמו", value: stats.publishedUploads },
    { label: "העלאות חדשות (7 ימים)", value: stats.newUploadsLast7Days },
    { label: "מנויים פעילים", value: stats.activeSubscriptions },
    { label: "מתנות שנשלחו (30 ימים)", value: stats.giftsSentLast30Days }
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">נתונים</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {CARDS.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-2xl font-bold text-cyan-400">{card.value.toLocaleString("he-IL")}</p>
            <p className="mt-1 text-xs text-neutral-400">{card.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold text-white">פילוח קטלוג לפי סוג תוכן</h2>
      <div className="space-y-2">
        {breakdown.length === 0 && <p className="text-sm text-neutral-500">אין נתונים עדיין.</p>}
        {breakdown.map((row) => (
          <div key={row.contentType} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2">
            <span className="text-sm text-neutral-300">{CONTENT_TYPE_LABELS[row.contentType] ?? row.contentType}</span>
            <span className="text-sm font-semibold text-white">{row.count.toLocaleString("he-IL")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
