"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { reportUploadAction } from "@/lib/report-actions";

interface ReportButtonProps {
  uploadId: string;
  uploadTitle: string;
}

export function ReportButton({ uploadId, uploadTitle }: ReportButtonProps): React.ReactElement {
  const t = useTranslations("report");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<"ok" | "error" | null>(null);

  const REASONS = ["copyright", "spam", "inappropriate", "other"] as const;

  async function submit(reason: string): Promise<void> {
    setSending(true);
    const result = await reportUploadAction(uploadId, uploadTitle, reason);
    setSending(false);
    setDone(result.ok ? "ok" : "error");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("buttonLabel")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="rounded-full bg-black/40 p-1.5 text-neutral-300 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" role="presentation" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("dialogTitle")}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border border-white/10 bg-neutral-900/95 p-3 text-right shadow-2xl backdrop-blur-xl"
          >
            {done === "ok" ? (
              <p role="status" className="text-xs text-neutral-300">
                {t("thanks")}
              </p>
            ) : (
              <>
                <h3 className="mb-2 text-xs font-semibold text-white">{t("dialogTitle")}</h3>
                <div className="flex flex-col gap-1">
                  {REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      disabled={sending}
                      onClick={() => void submit(t(`reasons.${reason}`))}
                      className="rounded-lg px-2 py-1.5 text-right text-xs text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      {t(`reasons.${reason}`)}
                    </button>
                  ))}
                </div>
                {done === "error" && <p className="mt-2 text-xs text-red-400">{t("error")}</p>}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
