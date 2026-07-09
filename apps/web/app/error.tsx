"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-white">משהו השתבש</h1>
      <p className="max-w-md text-neutral-400">אירעה שגיאה בלתי צפויה. אפשר לנסות שוב או לחזור לגילוי.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-200 ring-1 ring-cyan-400/40 hover:bg-cyan-500/30"
        >
          נסו שוב
        </button>
        <Link
          href="/browse"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 hover:bg-white/15"
        >
          חזרה לגילוי
        </Link>
      </div>
    </main>
  );
}
