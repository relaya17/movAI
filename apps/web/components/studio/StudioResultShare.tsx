"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface StudioResultShareProps {
  resultUrl: string;
  mediaType: "video" | "audio";
}

export function StudioResultShare({ resultUrl, mediaType }: StudioResultShareProps): React.ReactElement {
  const t = useTranslations("share.instagram");
  const [message, setMessage] = useState<string | null>(null);

  async function shareToInstagram(): Promise<void> {
    setMessage(null);

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        const response = await fetch(resultUrl);
        const blob = await response.blob();
        const ext = mediaType === "video" ? "mp4" : "mp3";
        const mime = mediaType === "video" ? "video/mp4" : "audio/mpeg";
        const file = new File([blob], `movai-creation.${ext}`, { type: mime });

        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "MoVAI Studio" });
          setMessage(t("opened"));
          return;
        }
      }

      window.open(resultUrl, "_blank", "noopener,noreferrer");
      setMessage(t("hint"));
    } catch {
      window.open(resultUrl, "_blank", "noopener,noreferrer");
      setMessage(t("hint"));
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <a
        href={resultUrl}
        download
        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/15"
      >
        {t("download")}
      </a>
      <button
        type="button"
        onClick={() => void shareToInstagram()}
        className="rounded-lg bg-gradient-to-r from-purple-500/80 to-pink-500/80 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        {t("share")}
      </button>
      {message ? <p className="w-full text-xs text-neutral-400">{message}</p> : null}
    </div>
  );
}
