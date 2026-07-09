"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { getProfileStatsAction } from "@/lib/profile-actions";

const PROFILE_VIDEO =
  "https://res.cloudinary.com/dora8sxcb/video/upload/v1783521760/seedance-2.0_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_2_kdnjwi.mp4";

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface ProfileClientProps {
  user: User;
}

export function ProfileClient({ user }: ProfileClientProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [creationsCount, setCreationsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.7;
    }
  }, []);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const result = await getProfileStatsAction();
        if ("error" in result) {
          setCredits(10);
          setCreationsCount(0);
        } else {
          setCredits(result.creditBalance);
          setCreationsCount(result.creationsCount);
        }
      } catch {
        setCredits(10);
        setCreationsCount(0);
      }
      setIsLoading(false);
    }

    if (user.id) {
      void fetchUserData();
    }
  }, [user.id]);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Video Background */}
      <div className="fixed inset-0 -z-10">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        >
          <source src={PROFILE_VIDEO} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-12">
        {/* Profile Header */}
        <div className="mb-12 text-center">
          {/* Avatar */}
          <div className="relative mx-auto mb-6 h-32 w-32">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || "Profile"}
                fill
                className="rounded-full border-4 border-white/20 object-cover shadow-2xl"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full border-4 border-white/20 bg-gradient-to-br from-cyan-500 to-blue-600 text-4xl font-bold text-white shadow-2xl">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 rounded-full bg-green-500 p-2 shadow-lg">
              <svg
                className="h-4 w-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Name & Email */}
          <h1 className="mb-2 font-orbitron text-3xl font-bold text-white drop-shadow-lg">
            {user.name || "משתמש MoVAI"}
          </h1>
          <p className="text-lg text-white/70">{user.email}</p>
        </div>

        {/* Stats Grid */}
        <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Credits Card */}
          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-cyan-500/30 hover:bg-white/10">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-sm text-white/60">קרדיטים</span>
            </div>
            <div className="text-4xl font-bold text-white">
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                credits ?? 0
              )}
            </div>
            <Link
              href="/pricing"
              className="mt-3 inline-block text-sm text-cyan-400 transition-colors hover:text-cyan-300"
            >
              הוסף קרדיטים ←
            </Link>
          </div>

          {/* Creations Card */}
          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-purple-500/30 hover:bg-white/10">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-3">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-sm text-white/60">יצירות</span>
            </div>
            <div className="text-4xl font-bold text-white">{creationsCount}</div>
            <Link
              href="/studio/gallery"
              className="mt-3 inline-block text-sm text-purple-400 transition-colors hover:text-purple-300"
            >
              הגלריה שלי ←
            </Link>
          </div>

          {/* Plan Card */}
          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-emerald-500/30 hover:bg-white/10">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <span className="text-sm text-white/60">תוכנית</span>
            </div>
            <div className="text-2xl font-bold text-white">Pay-as-you-go</div>
            <Link
              href="/pricing"
              className="mt-3 inline-block text-sm text-emerald-400 transition-colors hover:text-emerald-300"
            >
              שדרג תוכנית ←
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="mb-6 text-xl font-semibold text-white">פעולות מהירות</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link
              href="/studio"
              className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-cyan-500/30 hover:bg-white/10"
            >
              <div className="rounded-full bg-cyan-500/20 p-4">
                <svg
                  className="h-8 w-8 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-white">יצירה חדשה</span>
            </Link>

            <Link
              href="/browse"
              className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-purple-500/30 hover:bg-white/10"
            >
              <div className="rounded-full bg-purple-500/20 p-4">
                <svg
                  className="h-8 w-8 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-white">גלה תוכן</span>
            </Link>

            <Link
              href="/upload"
              className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-pink-500/30 hover:bg-white/10"
            >
              <div className="rounded-full bg-pink-500/20 p-4">
                <svg
                  className="h-8 w-8 text-pink-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-white">העלה תוכן</span>
            </Link>

            <Link
              href="/pricing"
              className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-emerald-500/30 hover:bg-white/10"
            >
              <div className="rounded-full bg-emerald-500/20 p-4">
                <svg
                  className="h-8 w-8 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-white">קנה קרדיטים</span>
            </Link>
          </div>
        </div>

        {/* Account Settings */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="mb-6 text-xl font-semibold text-white">הגדרות חשבון</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="font-medium text-white">שם מלא</p>
                <p className="text-sm text-white/60">{user.name || "לא הוגדר"}</p>
              </div>
              <button className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20">
                ערוך
              </button>
            </div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="font-medium text-white">אימייל</p>
                <p className="text-sm text-white/60">{user.email}</p>
              </div>
              <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-400">
                מאומת
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">סיסמה</p>
                <p className="text-sm text-white/60">••••••••</p>
              </div>
              <button className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20">
                שנה סיסמה
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="mb-4 text-xl font-semibold text-red-400">אזור מסוכן</h2>
          <p className="mb-4 text-sm text-white/60">
            מחיקת החשבון תסיר את כל הנתונים שלך לצמיתות. פעולה זו אינה ניתנת לביטול.
          </p>
          <button className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20">
            מחק חשבון
          </button>
        </div>
      </div>
    </div>
  );
}
