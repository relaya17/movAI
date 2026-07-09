"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import { getMovieSubtitlesAction, requestSubtitlesAction } from "@/lib/media-actions";

interface MovieSubtitlesPanelProps {
  movieSlug: string;
}

export function MovieSubtitlesPanel({ movieSlug }: MovieSubtitlesPanelProps): React.ReactElement {
  const t = useTranslations("movie.subtitles");
  const [tracks, setTracks] = useState<Array<{ id: string; language: string; status: string; content: string | null }>>([]);
  const [selectedLang, setSelectedLang] = useState("he");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getMovieSubtitlesAction(movieSlug).then((result) => {
      setTracks(result.tracks);
      setLoading(false);
    });
  }, [movieSlug]);

  const hasInFlight = tracks.some((t) => t.status === "pending" || t.status === "processing");

  useEffect(() => {
    if (!hasInFlight) return;
    const timer = setInterval(() => {
      void getMovieSubtitlesAction(movieSlug).then((result) => setTracks(result.tracks));
    }, 5000);
    return () => clearInterval(timer);
  }, [hasInFlight, movieSlug]);

  const readyTrack = tracks.find((track) => track.language === selectedLang && track.status === "ready");

  async function handleRequest(): Promise<void> {
    setMessage(null);
    const result = await requestSubtitlesAction(movieSlug, selectedLang);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(t("requested"));
    const refreshed = await getMovieSubtitlesAction(movieSlug);
    setTracks(refreshed.tracks);
  }

  return (
    <section className="mt-8 rounded-xl border border-white/10 bg-neutral-900/40 p-4">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t("description")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="subtitle-lang" className="text-sm text-neutral-300">
          {t("language")}
        </label>
        <select
          id="subtitle-lang"
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
        >
          <option value="he">{t("langHe")}</option>
          <option value="en">{t("langEn")}</option>
          <option value="ar">{t("langAr")}</option>
          <option value="ru">{t("langRu")}</option>
        </select>
        <Button type="button" onClick={() => void handleRequest()}>
          {t("request")}
        </Button>
      </div>

      {loading ? <p className="mt-3 text-sm text-neutral-500">{t("loading")}</p> : null}
      {message ? <p className="mt-3 text-sm text-cyan-400">{message}</p> : null}

      {tracks.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {tracks.map((track) => (
            <li key={track.id} className="flex justify-between rounded-lg bg-black/20 px-3 py-2">
              <span>{track.language}</span>
              <span className="text-neutral-400">{t(`status.${track.status}`)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {readyTrack?.content ? (
        <div className="mt-4 space-y-2">
          <a
            href={`data:text/vtt;charset=utf-8,${encodeURIComponent(readyTrack.content)}`}
            download={`${movieSlug}-${selectedLang}.vtt`}
            className="inline-block text-sm text-cyan-400 hover:underline"
          >
            {t("download")}
          </a>
          <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-neutral-300 whitespace-pre-wrap">
            {readyTrack.content.slice(0, 2000)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
