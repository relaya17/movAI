"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PROMO_VIDEO =
  "https://res.cloudinary.com/dora8sxcb/video/upload/v1783467977/seedance-2.0_Continue_the_futuristic_MoVAI_promotional_video._Scene_Show_a_user_opening_the_M-0_oxzurb.mp4";

const PLAYBACK_RATE = 0.9;
const MAX_VIDEO_DURATION_MS = 12_000;
const CROSSFADE_MS = 1_400;

type Phase = "video" | "transition" | "content";

interface BrowsePageClientProps {
  children: React.ReactNode;
}

export function BrowsePageClient({ children }: BrowsePageClientProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<Phase>("video");

  const beginTransition = useCallback((): void => {
    setPhase((current) => (current === "video" ? "transition" : current));
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setPhase("content");
    }
  }, []);

  useEffect(() => {
    if (phase !== "video") return;

    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playbackRate = PLAYBACK_RATE;
    void video.play().catch(() => beginTransition());
  }, [beginTransition, phase]);

  useEffect(() => {
    if (phase !== "video") return;
    const timer = setTimeout(() => beginTransition(), MAX_VIDEO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [beginTransition, phase]);

  useEffect(() => {
    if (phase !== "transition") return;
    const timer = setTimeout(() => setPhase("content"), CROSSFADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const showVideo = phase === "video" || phase === "transition";
  const videoFading = phase === "transition";
  const showContent = phase === "transition" || phase === "content";

  return (
    <>
      {/* Full-screen Promo Video */}
      {showVideo && (
        <div className="fixed inset-0 z-[100] bg-black">
          <video
            ref={videoRef}
            className={`h-full w-full object-cover transition-opacity duration-[1400ms] ease-in-out ${
              videoFading ? "opacity-0" : "opacity-100"
            }`}
            src={PROMO_VIDEO}
            muted
            playsInline
            preload="auto"
            onEnded={beginTransition}
            onError={beginTransition}
            aria-label="פרומו MoVAI"
          />
        </div>
      )}

      {/* Main Content (navbar + page) */}
      <div
        className={`transition-opacity duration-1000 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        {children}
      </div>
    </>
  );
}
