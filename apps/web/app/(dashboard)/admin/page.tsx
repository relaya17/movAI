import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/admin";

export const metadata = {
  title: "ניהול | MoVAI Admin"
};

const ADMIN_LINKS = [
  { href: "/admin/reports", label: "דיווחי תוכן", description: "דיווחים ממתינים על העלאות משתמשים" },
  { href: "/admin/dubbing", label: "בקשות הרשאה לדיבוב", description: "אישור/דחיית בקשות דיבוב" },
  { href: "/admin/sponsors", label: "ספונסרים", description: "ניהול באנרי ספונסרים" },
  { href: "/admin/stats", label: "סטטיסטיקות", description: "מדדי שימוש כלליים" }
];

/** Single entry point to every admin-only page - none of them were linked from anywhere before this, only reachable by typing the URL directly. */
export default async function AdminHomePage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!isAdminUser(session?.user?.email)) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">ניהול MoVAI</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {ADMIN_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10"
          >
            <p className="font-semibold text-white">{link.label}</p>
            <p className="mt-1 text-sm text-neutral-400">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
