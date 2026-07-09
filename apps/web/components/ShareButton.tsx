"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface ShareButtonProps {
  title: string;
  url?: string;
}

export function ShareButton({ title, url }: ShareButtonProps): React.ReactElement {
  const t = useTranslations("share");
  const [message, setMessage] = useState<string | null>(null);

  async function handleShare(): Promise<void> {
    const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
    setMessage(null);

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setMessage(t("copied"));
    } catch {
      setMessage(t("copyFailed"));
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => {
          void handleShare();
        }}
        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/15"
      >
        {t("share")}
      </button>
      {message ? <p className="text-xs text-neutral-400">{message}</p> : null}
    </div>
  );
}
