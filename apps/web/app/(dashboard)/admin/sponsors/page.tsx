import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminUser } from "@/lib/admin";
import { listAllSponsors } from "@movai/db";
import { createSponsorAction, toggleSponsorActiveAction, deleteSponsorAction } from "@/lib/sponsor-actions";

export const metadata = {
  title: "ניהול ספונסרים | MoVAI"
};

/**
 * Manual-only sponsor management (no automated ad network) - every banner
 * free/non-subscriber users see (components/dashboard/SponsorBanner.tsx)
 * was added here by hand. 404s instead of redirecting for a non-admin, so
 * the page's existence isn't confirmed to someone probing the URL.
 */
export default async function AdminSponsorsPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!isAdminUser(session?.user?.email)) {
    notFound();
  }

  const sponsors = await listAllSponsors(db);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">ניהול ספונסרים</h1>
      <p className="mb-8 text-sm text-neutral-400">
        הבאנרים כאן מוצגים רק למשתמשים ללא מנוי פעיל (ראו הטבת &quot;ללא פרסומות&quot; בעמוד המנויים). אין רשת פרסום אוטומטית - כל שורה כאן נוספה ידנית.
      </p>

      <form
        action={async (formData) => {
          "use server";
          await createSponsorAction(formData);
        }}
        className="mb-10 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <h2 className="text-lg font-semibold text-white">הוספת ספונסר חדש</h2>
        <input
          name="name"
          placeholder="שם הספונסר"
          required
          className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-white"
        />
        <input
          name="imageUrl"
          placeholder="קישור לתמונת הבאנר"
          required
          className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-white"
        />
        <input
          name="linkUrl"
          placeholder="קישור יעד (לאן הבאנר מוביל בלחיצה)"
          required
          className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-white"
        />
        <button type="submit" className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-white hover:bg-cyan-400">
          הוסף ספונסר
        </button>
      </form>

      <div className="space-y-3">
        {sponsors.length === 0 && <p className="text-neutral-500">אין ספונסרים עדיין.</p>}
        {sponsors.map((sponsor) => (
          <div
            key={sponsor.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{sponsor.name}</p>
              <p className="truncate text-xs text-neutral-500">{sponsor.linkUrl}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                sponsor.isActive === 1 ? "bg-green-500/20 text-green-400" : "bg-neutral-700 text-neutral-400"
              }`}
            >
              {sponsor.isActive === 1 ? "פעיל" : "כבוי"}
            </span>
            <form
              action={async () => {
                "use server";
                await toggleSponsorActiveAction(sponsor.id, sponsor.isActive !== 1);
              }}
            >
              <button type="submit" className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
                {sponsor.isActive === 1 ? "כבה" : "הפעל"}
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                await deleteSponsorAction(sponsor.id);
              }}
            >
              <button type="submit" className="shrink-0 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/30">
                מחק
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
