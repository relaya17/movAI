"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const PROMO_VIDEO =
  "https://res.cloudinary.com/dora8sxcb/video/upload/v1783467883/seedance-2.0_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_kmxvdw.mp4";

const BACKGROUND_IMAGE =
  "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468280/gpt-image-2_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_c0cywb.jpg";

const PLAYBACK_RATE = 0.85;
const MAX_PROMO_DURATION_MS = 12_000;
const CROSSFADE_MS = 1_400;
const BUTTONS_REVEAL_DELAY_MS = 700;

type PromoPhase = "promo" | "transition" | "landing";

interface HeroPromoProps {
  authButtons: React.ReactNode;
}

export function HeroPromo({ authButtons }: HeroPromoProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<PromoPhase>("promo");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);

  const markVideoUnavailable = useCallback((): void => {
    setVideoUnavailable(true);
    // Keep the cinematic backdrop for the full promo window — don't jump
    // straight to auth buttons when Cloudinary/autoplay hiccups.
  }, []);

  const beginLandingTransition = useCallback((): void => {
    setPhase((current) => {
      if (current !== "promo") return current;
      return "transition";
    });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = (): void => {
      const reduced = mediaQuery.matches;
      setPrefersReducedMotion(reduced);
      if (reduced) setPhase("landing");
    };

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (phase !== "promo" || prefersReducedMotion) return;

    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playbackRate = PLAYBACK_RATE;
    video.defaultPlaybackRate = PLAYBACK_RATE;
    void video.play().catch(() => markVideoUnavailable());
  }, [markVideoUnavailable, phase, prefersReducedMotion]);

  useEffect(() => {
    if (phase !== "promo" || prefersReducedMotion) return;

    const timeoutId = window.setTimeout(() => beginLandingTransition(), MAX_PROMO_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [beginLandingTransition, phase, prefersReducedMotion]);

  useEffect(() => {
    if (phase !== "transition") return;

    const timeoutId = window.setTimeout(() => setPhase("landing"), CROSSFADE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  const showVideo = !videoUnavailable && (phase === "promo" || phase === "transition");
  const videoFading = phase === "transition";
  const showButtons = phase === "transition" || phase === "landing";

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Landing backdrop loads under the video so the crossfade has no flash. */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src={BACKGROUND_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={85}
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {showVideo && (
        <video
          ref={videoRef}
          className={`absolute inset-0 z-20 h-full w-full object-cover object-center transition-opacity duration-[1400ms] ease-in-out ${
            videoFading ? "opacity-0" : "opacity-100"
          }`}
          src={PROMO_VIDEO}
          muted
          playsInline
          preload="metadata"
          autoPlay={phase === "promo"}
          onEnded={beginLandingTransition}
          onError={markVideoUnavailable}
          onStalled={markVideoUnavailable}
          aria-label="פרומו MoVAI"
        />
      )}

      {/* Buttons — centered vertically & horizontally on every screen size */}
      <div className="absolute inset-0 z-30 flex items-center justify-center px-6">
        <div
          className={`flex w-full flex-col items-center transition-all duration-1000 ease-out ${
            showButtons ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
          }`}
          style={{ transitionDelay: showButtons ? `${BUTTONS_REVEAL_DELAY_MS}ms` : "0ms" }}
        >
          {authButtons}
        </div>
      </div>
    </div>
  );
}
