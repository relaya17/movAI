"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getGiftCatalog, sendGift, type GiftItem } from "@/lib/gift-actions";
import { GiftAnimation } from "./GiftAnimation";

interface GiftButtonProps {
  uploadId: string;
  disabled?: boolean;
}

export function GiftButton({ uploadId, disabled }: GiftButtonProps) {
  const t = useTranslations("gifts");
  const [isOpen, setIsOpen] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState<{ emoji: string; name: string } | null>(null);

  useEffect(() => {
    if (isOpen && gifts.length === 0) {
      void getGiftCatalog().then(setGifts);
    }
  }, [isOpen, gifts.length]);

  const handleSendGift = async (giftId: string) => {
    setSending(giftId);
    setError(null);

    const result = await sendGift(uploadId, giftId);

    if (result.success) {
      const gift = gifts.find((g) => g.id === giftId);
      setIsOpen(false);
      // Show dramatic animation
      if (gift) {
        setShowAnimation({ emoji: gift.emoji, name: gift.name });
      }
    } else {
      setError(result.error ?? t("genericError"));
    }

    setSending(null);
  };

  return (
    <>
      {/* Dramatic gift animation overlay */}
      {showAnimation && (
        <GiftAnimation
          emoji={showAnimation.emoji}
          name={showAnimation.name}
          onComplete={() => setShowAnimation(null)}
        />
      )}

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-2 text-sm font-medium text-amber-400 ring-1 ring-amber-500/30 transition-all hover:from-amber-500/30 hover:to-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>🎁</span>
          <span>{t("sendGift")}</span>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              role="presentation"
            />

            {/* Gift Picker */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("chooseGift")}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsOpen(false);
              }}
              className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-2xl border border-white/10 bg-neutral-900/95 p-4 shadow-2xl backdrop-blur-xl"
            >
              <h3 className="mb-3 text-center text-sm font-semibold text-white">{t("chooseGift")}</h3>

              {error && (
                <p className="mb-3 rounded-lg bg-red-500/10 p-2 text-center text-xs text-red-400">
                  {error}
                </p>
              )}

                <div className="grid grid-cols-4 gap-3">
                {gifts.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => void handleSendGift(gift.id)}
                    disabled={sending !== null}
                    aria-label={`${gift.name} - ${gift.costInCredits} ${t("credits")}`}
                    className="group flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:scale-110 hover:border-amber-500/50 hover:bg-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="text-3xl transition-transform group-hover:scale-125">
                      {sending === gift.id ? (
                        <svg className="h-8 w-8 animate-spin text-amber-400" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        gift.emoji
                      )}
                    </span>
                    <span className="text-xs font-medium text-amber-400">{gift.costInCredits}</span>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-center text-xs text-neutral-500">
                {t("creatorShare")}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
