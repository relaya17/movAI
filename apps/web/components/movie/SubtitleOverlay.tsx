"use client";

import { useMemo } from "react";

interface VttCue {
  start: number;
  end: number;
  text: string;
}

function parseVtt(content: string): VttCue[] {
  const cues: VttCue[] = [];
  const blocks = content.split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;
    const [startRaw, endRaw] = timeLine.split("-->").map((s) => s.trim());
    const start = parseVttTime(startRaw ?? "");
    const end = parseVttTime(endRaw ?? "");
    const text = lines.slice(lines.indexOf(timeLine) + 1).join("\n").trim();
    if (text) cues.push({ start, end, text });
  }
  return cues;
}

function parseVttTime(raw: string): number {
  const parts = raw.split(":");
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number.parseFloat(parts[2] ?? "0");
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number.parseFloat(parts[1] ?? "0");
  }
  return 0;
}

interface SubtitleOverlayProps {
  vttContent: string;
  currentTime: number;
}

export function SubtitleOverlay({ vttContent, currentTime }: SubtitleOverlayProps): React.ReactElement | null {
  const cues = useMemo(() => parseVtt(vttContent), [vttContent]);
  const active = cues.find((cue) => currentTime >= cue.start && currentTime <= cue.end);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center px-4">
      <p className="max-w-2xl rounded-lg bg-black/75 px-4 py-2 text-center text-lg font-medium text-white shadow-lg">
        {active.text}
      </p>
    </div>
  );
}

export function SubtitleTranscript({ vttContent }: { vttContent: string }): React.ReactElement {
  const cues = useMemo(() => parseVtt(vttContent), [vttContent]);

  return (
    <ol className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm text-neutral-300">
      {cues.map((cue, i) => (
        <li key={i} className="rounded bg-black/20 px-2 py-1">
          <span className="text-xs text-neutral-500">{formatTime(cue.start)}</span> {cue.text}
        </li>
      ))}
    </ol>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
