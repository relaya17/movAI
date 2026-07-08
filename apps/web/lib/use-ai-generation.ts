"use client";

import { useCallback, useRef, useState } from "react";
import { getGenerationStatusAction } from "./ai-studio-actions";

export type GenerationPhase = "idle" | "starting" | "processing" | "done" | "error";

export interface StartGenerationResult {
  creationId?: string | undefined;
  error?: string | undefined;
}

/**
 * Shared client-side state machine for the three Studio generators
 * (Video/Music/Voice). Generation is async on Replicate's side - `start`
 * kicks off the server action, then polls `getGenerationStatusAction` every
 * 3s until the creation lands in a terminal state, so this intentionally
 * does NOT block on a single long-running request (which would hit a
 * server action's execution time limit for anything but the shortest
 * generations).
 */
export function useAiGeneration() {
  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const poll = useCallback((creationId: string) => {
    const tick = async (): Promise<void> => {
      const status = await getGenerationStatusAction(creationId);

      if (status.status === "completed") {
        setResultUrl(status.resultUrl ?? null);
        setPhase("done");
        return;
      }

      if (status.status === "failed" || status.status === "cancelled") {
        setError(status.error ?? "היצירה נכשלה");
        setPhase("error");
        return;
      }

      pollTimer.current = setTimeout(() => void tick(), 3000);
    };

    void tick();
  }, []);

  const start = useCallback(
    async (action: () => Promise<StartGenerationResult>): Promise<void> => {
      stopPolling();
      setPhase("starting");
      setError(null);
      setResultUrl(null);

      const result = await action();

      if (result.error || !result.creationId) {
        setError(result.error ?? "שגיאה ביצירה");
        setPhase("error");
        return;
      }

      setPhase("processing");
      poll(result.creationId);
    },
    [poll, stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setPhase("idle");
    setResultUrl(null);
    setError(null);
  }, [stopPolling]);

  return { phase, resultUrl, error, start, reset };
}
