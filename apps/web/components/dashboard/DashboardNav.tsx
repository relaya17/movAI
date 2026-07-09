"use client";

import Link from "next/link";
import { useState } from "react";
import type { User } from "next-auth";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface DashboardNavProps {
  user: User;
  creditBalance?: number;
  /** Yearly-tier subscription perk (see @movai/db subscriptionPlans.founderBadge) - a small marker next to the username, nothing more. */
  founderBadge?: boolean;
}

export function DashboardNav({ user, creditBalance, founderBadge }: DashboardNavProps): React.ReactElement {
  const t = useTranslations("nav");

  const NAV_LINKS: Array<{ href: string; label: string; highlight?: boolean }> = [
    { href: "/browse", label: t("discover") },
    { href: "/watchlist", label: t("watchlist") },
    { href: "/studio", label: t("studio"), highlight: true },
    { href: "/upload", label: t("upload") },
  ];

  // Two independent panels sharing the header used to share one boolean, so
  // tapping the hamburger on mobile silently toggled the (desktop-anchored,
  // profile-only) dropdown instead of showing the nav links - there was no
  // way to reach סרטים/סטנדאפ/מוזיקה/שירה/העלאה on a phone at all.
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/browse" prefetch className="flex items-baseline font-orbitron font-bold tracking-widest" dir="ltr">
          <span className="text-xl text-white sm:text-2xl">MoV</span>
          <span
            className="text-2xl sm:text-3xl"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #67e8f9 50%, #06b6d4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 12px rgba(103,232,249,0.6))"
            }}
          >
            AI
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              className={`text-sm font-medium transition-colors ${
                link.highlight
                  ? "rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-1.5 text-cyan-300 ring-1 ring-cyan-500/30 hover:from-cyan-500/30 hover:to-blue-500/30"
                  : "text-neutral-300 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {typeof creditBalance === "number" && (
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 px-3 py-1.5 text-sm font-semibold text-amber-300 ring-1 ring-amber-500/30 transition-colors hover:from-amber-500/25 hover:to-orange-500/25"
            >
              <span>💰</span>
              <span>{creditBalance.toLocaleString("he-IL")}</span>
            </Link>
          )}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/10"
            >
              {founderBadge && (
                <span title="תומך מייסד" className="text-amber-400">
                  👑
                </span>
              )}
              <span className="hidden sm:inline">{user.name ?? user.email}</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {profileMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-neutral-900/95 py-2 shadow-2xl backdrop-blur-xl">
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  {t("profile")}
                </Link>
                <Link
                  href="/pricing"
                  className="block px-4 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  {t("buyCredits")}
                </Link>
                <Link
                  href="/pricing/subscription"
                  className="block px-4 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  {t("subscription")}
                </Link>
                <Link
                  href="/wallet"
                  className="block px-4 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  {t("giftWallet")}
                </Link>
                <hr className="my-2 border-white/10" />
                <button
                  onClick={() => {
                    void signOut({ callbackUrl: "/" });
                  }}
                  className="block w-full px-4 py-2 text-right text-sm text-red-400 hover:bg-white/5"
                >
                  {t("signOut")}
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button - opens the nav links panel below, independent of the profile dropdown above */}
          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label={t("menuLabel")}
            className="rounded-lg p-2 text-neutral-400 hover:bg-white/5 hover:text-white md:hidden"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav panel - the only way to reach these links below the md breakpoint */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
