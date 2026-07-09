"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import {
  getDubbingStatusAction,
  requestDubbingPermissionAction,
  startDubbingAction,
  type DubbingStatusDto
} from "@/lib/media-actions";

interface MovieDubbingPanelProps {
  movieSlug: string;
}

export function MovieDubbingPanel({ movieSlug }: MovieDubbingPanelProps): React.ReactElement {
  const t = useTranslations("movie.dubbing");
  const [status, setStatus] = useState<DubbingStatusDto | null>(null);
  const [targetLang, setTargetLang] = useState("he");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void getDubbingStatusAction(movieSlug).then((result) => {
      if ("error" in result && result.error) return;
      if (!("gateEligibility" in result)) return;
      setStatus(result);
    });
  }, [movieSlug]);

  if (!status) return <></>;

  async function refresh(): Promise<void> {
    const result = await getDubbingStatusAction(movieSlug);
    if ("gateEligibility" in result) setStatus(result);
  }

  async function handlePermissionRequest(): Promise<void> {
    setMessage(null);
    const result = await requestDubbingPermissionAction(movieSlug, targetLang, reason || undefined);
    setMessage(result.error ?? t("permissionSent"));
    await refresh();
  }

  async function handleStartDubbing(): Promise<void> {
    setMessage(null);
    const result = await startDubbingAction(movieSlug, targetLang);
    setMessage(result.error ?? t("jobStarted"));
    await refresh();
  }

  const canDub =
    status.gateEligibility === "allowed" ||
    (status.gateEligibility === "permission_required" && status.permissionStatus === "approved");

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-neutral-900/40 p-4">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t(`gate.${status.gateReasonKey}`)}</p>

      {status.gateEligibility === "blocked" ? (
        <p className="mt-3 text-sm text-amber-400">{t("blocked")}</p>
      ) : null}

      {status.gateEligibility === "permission_required" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-neutral-300">
            {t("permissionStatus")}: {t(`permission.${status.permissionStatus}`)}
          </p>
          {status.permissionStatus === "none" || status.permissionStatus === "denied" ? (
            <>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />
              <Button type="button" onClick={() => void handlePermissionRequest()}>
                {t("requestPermission")}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {canDub ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="he">{t("langHe")}</option>
            <option value="en">{t("langEn")}</option>
          </select>
          <Button type="button" onClick={() => void handleStartDubbing()}>
            {t("start")}
          </Button>
        </div>
      ) : null}

      {status.jobStatus !== "none" ? (
        <p className="mt-3 text-sm text-neutral-400">
          {t("jobStatus")}: {t(`job.${status.jobStatus}`)}
        </p>
      ) : null}

      {status.resultUrl ? (
        <a href={status.resultUrl} className="mt-2 inline-block text-sm text-cyan-400 hover:underline">
          {t("download")}
        </a>
      ) : null}

      {message ? <p className="mt-3 text-sm text-cyan-400">{message}</p> : null}
    </section>
  );
}
