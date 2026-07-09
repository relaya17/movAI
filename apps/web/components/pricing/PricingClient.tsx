"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createCheckoutSession } from "@/lib/payment-actions";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceNis: string;
  priceUsd: string;
  bonusCredits: number;
  sortOrder: number;
}

interface PricingClientProps {
  packages: CreditPackage[];
  currentBalance: number;
}

export function PricingClient({ packages, currentBalance }: PricingClientProps) {
  const t = useTranslations("pricing");
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId);
    setError(null);

    const result = await createCheckoutSession(packageId);

    if (result.error || !result.url) {
      setError(result.error ?? t("genericError"));
      setLoading(null);
      return;
    }

    // Redirect to Stripe Checkout
    window.location.href = result.url;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 font-orbitron text-4xl font-bold text-white">
          {t("pageHeadingPrefix")}{" "}
          <span
            className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
          >
            {t("pageHeadingSuffix")}
          </span>
        </h1>
        <p className="text-lg text-neutral-400">
          {t("pageSubtitle")}
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-8 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
          <p className="text-green-400">{t("paymentSuccess")}</p>
        </div>
      )}

      {canceled && (
        <div className="mb-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
          <p className="text-yellow-400">{t("paymentCanceled")}</p>
        </div>
      )}

      {error && (
        <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Current Balance */}
      <div className="mb-12 rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
        <p className="mb-2 text-sm text-neutral-400">{t("currentBalance")}</p>
        <p className="font-orbitron text-5xl font-bold text-white">{currentBalance}</p>
        <p className="mt-1 text-neutral-500">{t("credits")}</p>
      </div>

      {/* Pricing Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg, index) => {
          const totalCredits = pkg.credits + pkg.bonusCredits;
          const isPopular = index === 2; // Third package is "popular"

          return (
            <div
              key={pkg.id}
              className={`relative rounded-2xl border p-6 transition-all hover:scale-[1.02] ${
                isPopular
                  ? "border-cyan-500/50 bg-gradient-to-b from-cyan-500/10 to-transparent"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-1 text-xs font-bold text-white">
                  {t("mostPopular")}
                </div>
              )}

              <div className="mb-4 text-center">
                <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">₪{pkg.priceNis}</span>
                </div>
              </div>

              <div className="mb-6 space-y-3 text-center">
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-3xl font-bold text-cyan-400">{totalCredits}</p>
                  <p className="text-sm text-neutral-400">{t("credits")}</p>
                </div>
                {pkg.bonusCredits > 0 && (
                  <p className="text-sm text-green-400">
                    {t("bonusCredits", { count: pkg.bonusCredits })}
                  </p>
                )}
              </div>

              <div className="mb-6 space-y-2 text-sm text-neutral-400">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{t("estVideos", { count: Math.floor(totalCredits / 12) })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{t("estMusic", { count: Math.floor(totalCredits / 2) })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{t("estNarrations", { count: totalCredits })}</span>
                </div>
              </div>

              <button
                onClick={() => void handlePurchase(pkg.id)}
                disabled={loading !== null}
                className={`w-full rounded-xl py-3 font-semibold transition-all ${
                  isPopular
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400"
                    : "bg-white/10 text-white hover:bg-white/20"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {loading === pkg.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("processing")}
                  </span>
                ) : (
                  t("buyNow")
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Credit Usage Info */}
      <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">{t("costHeading")}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white/5 p-4 text-center">
            <div className="mb-2 text-2xl">🎬</div>
            <p className="font-semibold text-white">{t("costVideo")}</p>
            <p className="text-sm text-neutral-400">{t("costVideoPrice")}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4 text-center">
            <div className="mb-2 text-2xl">🎵</div>
            <p className="font-semibold text-white">{t("costMusic")}</p>
            <p className="text-sm text-neutral-400">{t("costMusicPrice")}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4 text-center">
            <div className="mb-2 text-2xl">🎙️</div>
            <p className="font-semibold text-white">{t("costNarration")}</p>
            <p className="text-sm text-neutral-400">{t("costNarrationPrice")}</p>
          </div>
        </div>
      </div>

      {/* Security Badge */}
      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-neutral-500">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>{t("securePayment")}</span>
      </div>

      {/* Subscription cross-link - a recurring plan (day/week/month/year) bundles credits at a discount plus ad-free/priority perks, see /pricing/subscription */}
      <div className="mt-4 text-center">
        <a href="/pricing/subscription" className="text-sm text-cyan-400 underline-offset-4 hover:underline">
          מעדיפים מנוי חודשי? לרמות המחיר של המנוי
        </a>
      </div>
    </div>
  );
}
