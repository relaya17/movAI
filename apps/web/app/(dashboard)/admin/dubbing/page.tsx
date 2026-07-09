import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/admin";
import { listPendingDubbingPermissionsAction, reviewDubbingPermissionAction } from "@/lib/dubbing-admin-actions";

export const metadata = {
  title: "אישור דיבוב | MoVAI Admin"
};

export default async function AdminDubbingPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!isAdminUser(session?.user?.email)) {
    notFound();
  }

  const { items } = await listPendingDubbingPermissionsAction();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">בקשות הרשאה לדיבוב</h1>
      <p className="mb-8 text-sm text-neutral-400">
        בקשות ממתינות ממשתמשים שרוצים לדבב תוכן שדורש אישור משפטי. אשרו רק כשיש בסיס חוקי.
      </p>

      {items.length === 0 ? (
        <p className="text-neutral-500">אין בקשות ממתינות.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">{item.movieTitle}</p>
              <p className="mt-1 text-sm text-neutral-400">
                {item.userEmail} · שפה: {item.targetLanguage} · {new Date(item.createdAt).toLocaleString("he-IL")}
              </p>
              {item.reason ? <p className="mt-2 text-sm text-neutral-300">{item.reason}</p> : null}
              <div className="mt-4 flex gap-2">
                <form
                  action={async () => {
                    "use server";
                    await reviewDubbingPermissionAction(item.id, "approved");
                  }}
                >
                  <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                    אשר
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await reviewDubbingPermissionAction(item.id, "denied");
                  }}
                >
                  <button type="submit" className="rounded-lg bg-red-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                    דחה
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
