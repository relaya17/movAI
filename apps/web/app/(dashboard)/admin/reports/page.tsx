import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/admin";
import { listPendingContentReportsAction, resolveContentReportAction } from "@/lib/report-admin-actions";

export const metadata = {
  title: "דיווחי תוכן | MoVAI Admin"
};

/**
 * Review queue for reportUploadAction (report-actions.ts) - previously
 * reports only fired an email with no durable record; this reads the real
 * content_reports table and lets an admin mark each one resolved (action
 * taken - e.g. the upload was removed) or dismissed (no action needed).
 * Same 404-not-redirect admin gate as /admin/sponsors and /admin/dubbing.
 */
export default async function AdminReportsPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!isAdminUser(session?.user?.email)) {
    notFound();
  }

  const { items } = await listPendingContentReportsAction();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">דיווחי תוכן</h1>
      <p className="mb-8 text-sm text-neutral-400">דיווחים ממתינים על העלאות משתמשים. סמנו כ&quot;טופל&quot; לאחר פעולה, או &quot;דחייה&quot; אם אין צורך בפעולה.</p>

      {items.length === 0 ? (
        <p className="text-neutral-500">אין דיווחים ממתינים.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">{item.uploadTitle}</p>
              <p className="mt-1 text-sm text-neutral-400">
                {item.reporterEmail ?? "אנונימי"} · {new Date(item.createdAt).toLocaleString("he-IL")}
              </p>
              <p className="mt-2 text-sm text-neutral-300">סיבה: {item.reason}</p>
              <div className="mt-4 flex gap-2">
                <form
                  action={async () => {
                    "use server";
                    await resolveContentReportAction(item.id, "resolved");
                  }}
                >
                  <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                    טופל
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await resolveContentReportAction(item.id, "dismissed");
                  }}
                >
                  <button type="submit" className="rounded-lg bg-neutral-700 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-600">
                    דחייה
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
