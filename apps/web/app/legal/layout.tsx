import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div
        role="note"
        className="mb-6 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
      >
        טיוטה ראשונית שנוצרה לצורך פיתוח (Phase 0). יש לאמת מול עו״ד לפני פרסום מסחרי — ראו architecture plan §1.
      </div>
      <article className="max-w-none space-y-4 leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold">
        {children}
      </article>
    </div>
  );
}
