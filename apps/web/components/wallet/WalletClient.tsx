"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ReceivedGift } from "@/lib/gift-actions";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: Date;
}

interface GiftStats {
  totalReceived: number;
  totalSent: number;
  giftsReceived: number;
  giftsSent: number;
}

interface WalletClientProps {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  transactions: Transaction[];
  giftStats: GiftStats;
  receivedGifts: ReceivedGift[];
}

const LOCALE_TO_INTL: Record<string, string> = { he: "he-IL", en: "en-US", es: "es-ES", ru: "ru-RU", ar: "ar-SA" };

function getTransactionIcon(type: string): string {
  switch (type) {
    case "purchase":
      return "💳";
    case "gift":
      return "🎁";
    case "usage":
      return "⚡";
    case "signup_bonus":
      return "🎉";
    case "refund":
      return "↩️";
    default:
      return "📝";
  }
}

function getTransactionColor(amount: number): string {
  return amount >= 0 ? "text-green-400" : "text-red-400";
}

export function WalletClient({
  balance,
  totalPurchased,
  totalUsed,
  transactions,
  giftStats,
  receivedGifts,
}: WalletClientProps) {
  const t = useTranslations("wallet");
  const locale = useLocale();

  const formatDate = (date: Date): string =>
    new Intl.DateTimeFormat(LOCALE_TO_INTL[locale] ?? "en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 font-orbitron text-4xl font-bold text-white">
          {t("pageHeadingPrefix")}{" "}
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            {t("pageHeadingSuffix")}
          </span>
        </h1>
        <p className="text-lg text-neutral-400">
          {t("pageSubtitle")}
        </p>
      </div>

      {/* Balance Card */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-8 text-center">
        <p className="mb-2 text-sm text-neutral-400">{t("currentBalance")}</p>
        <p className="font-orbitron text-6xl font-bold text-white">{balance}</p>
        <p className="mt-2 text-neutral-500">{t("credits")}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-block rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2 font-semibold text-white transition-all hover:from-amber-400 hover:to-orange-400"
        >
          {t("addCredits")}
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{totalPurchased}</p>
          <p className="text-sm text-neutral-400">{t("stats.purchased")}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{totalUsed}</p>
          <p className="text-sm text-neutral-400">{t("stats.used")}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{giftStats.totalReceived}</p>
          <p className="text-sm text-neutral-400">{t("stats.receivedFromGifts")}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{giftStats.giftsSent}</p>
          <p className="text-sm text-neutral-400">{t("stats.giftsSent")}</p>
        </div>
      </div>

      {/* Recent Gifts */}
      {receivedGifts.length > 0 && (
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">{t("recentGifts")}</h2>
          <div className="space-y-3">
            {receivedGifts.map((gift) => (
              <div
                key={gift.id}
                className="flex items-center justify-between rounded-xl bg-white/5 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{gift.giftEmoji}</span>
                  <div>
                    <p className="font-medium text-white">{gift.giftName}</p>
                    <p className="text-sm text-neutral-400">{t("forLabel")}: {gift.uploadTitle}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-green-400">+{gift.creditsReceived}</p>
                  <p className="text-xs text-neutral-500">{formatDate(gift.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">{t("transactionHistory")}</h2>
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-neutral-400">{t("noTransactions")}</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl bg-white/5 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getTransactionIcon(tx.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {tx.description ?? tx.type}
                    </p>
                    <p className="text-xs text-neutral-500">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${getTransactionColor(tx.amount)}`}>
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount}
                  </p>
                  <p className="text-xs text-neutral-500">{t("balanceLabel")}: {tx.balanceAfter}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
