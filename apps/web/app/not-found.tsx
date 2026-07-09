import Link from "next/link";

export default function NotFound(): React.ReactElement {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-orbitron text-6xl font-bold tracking-widest text-cyan-400">404</p>
      <h1 className="text-2xl font-semibold text-white">העמוד לא נמצא</h1>
      <p className="max-w-md text-neutral-400">ייתכן שהקישור שגוי או שהתוכן הוסר מהקטלוג.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link
          href="/browse"
          className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-200 ring-1 ring-cyan-400/40 hover:bg-cyan-500/30"
        >
          חזרה לגילוי
        </Link>
        <Link
          href="/"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 hover:bg-white/15"
        >
          דף הבית
        </Link>
      </div>
    </main>
  );
}
