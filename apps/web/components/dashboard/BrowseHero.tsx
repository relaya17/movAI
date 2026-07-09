"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
const HERO_IMAGE =
  "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468294/kino-xl_a_cinematic_photo_of_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-p-0_kykzup.jpg";

interface BrowseHeroProps {
  /** Which pill is highlighted - "all" when no ?category= filter is active. */
  activeCategory: string;
}

export function BrowseHero({ activeCategory }: BrowseHeroProps): React.ReactElement {
  const tBrowse = useTranslations("browse.categoryPills");
  const tContent = useTranslations("contentTypes");
  const [mounted, setMounted] = useState(false);

  const CATEGORY_PILLS = [
    { id: "movies", label: tBrowse("movies"), href: "/browse?category=movies" },
    { id: "standup", label: tContent("standup"), href: "/browse?category=standup" },
    { id: "music", label: tContent("music"), href: "/browse?category=music" },
    { id: "singing", label: tContent("singing"), href: "/browse?category=singing" },
    { id: "all", label: tBrowse("showAll"), href: "/browse" }
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full pt-16">
      {/* Hero Image - clean, full visibility */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`relative aspect-[21/9] overflow-hidden rounded-2xl transition-all duration-[1400ms] ease-out ${
            mounted ? "scale-100 opacity-100" : "scale-105 opacity-0"
          }`}
        >
          <Image
            src={HERO_IMAGE}
            alt="MoVAI קולנוע"
            fill
            priority
            sizes="100vw"
            quality={90}
            className="object-cover object-center"
          />
          {/* Subtle gradient only at bottom for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-neutral-950/80 to-transparent" />
          
          {/* Cinematic Logo overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center" dir="ltr">
            <h1 className="relative font-orbitron">
              {/* MoV in white */}
              <span 
                className="text-5xl font-bold tracking-widest text-white sm:text-7xl md:text-8xl lg:text-9xl"
                style={{
                  textShadow: "0 0 20px rgba(255,255,255,0.3), 0 0 60px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.9)",
                }}
              >
                MoV
              </span>
              {/* AI bigger and gradient */}
              <span 
                className="relative text-6xl font-black tracking-widest sm:text-8xl md:text-9xl lg:text-[12rem]"
                style={{
                  background: "linear-gradient(180deg, #ffffff 0%, #67e8f9 30%, #06b6d4 60%, #0e7490 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 30px rgba(103,232,249,0.8)) drop-shadow(0 0 60px rgba(6,182,212,0.5)) drop-shadow(0 0 100px rgba(6,182,212,0.3))",
                }}
              >
                AI
              </span>
            </h1>
            
            {/* Tagline */}
            <p 
              className="mt-6 font-bebas text-xl uppercase tracking-[0.5em] text-white/80 sm:mt-8 sm:text-2xl md:text-3xl"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(103,232,249,0.3)" }}
            >
              Discover the Unseen
            </p>
          </div>
        </div>
      </div>

      {/* Category pills - below the image, not covering it */}
      <div
        className={`mx-auto mt-6 max-w-7xl px-4 transition-all delay-300 duration-1000 sm:px-6 lg:px-8 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          {CATEGORY_PILLS.map((pill) => (
            <Link
              key={pill.id}
              href={pill.href}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                pill.id === activeCategory
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
                  : "border border-white/15 bg-white/5 text-neutral-300 hover:border-cyan-400/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              {pill.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
