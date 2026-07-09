"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSubscriptionCheckoutSession, createBillingPortalSession } from "@/lib/subscription-actions";

interface SubscriptionPlan {
  id: string;
  interval: "daily" | "weekly" | "monthly" | "yearly";
  name: string;
  priceNis: string;
  creditsPerPeriod: number;
  adFree: boolean;
  priorityQueue: boolean;
  earlyAccess: boolean;
  founderBadge: boolean;
}

interface ActiveSubscription {
  planName: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionClientProps {
  plans: SubscriptionPlan[];
  active: ActiveSubscription | null;
}

const INTERVAL_LABELS: Record<SubscriptionPlan["interval"], string> = {
  daily: "ליום",
  weekly: "לשבוע",
  monthly: "לחודש",
  yearly: "לשנה"
};

export function SubscriptionClient({ plans, active }: SubscriptionClientProps) {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (interval: SubscriptionPlan["interval"]) => {
    setLoading(interval);
    setError(null);

    const result = await createSubscriptionCheckoutSession(interval);
    if (result.error || !result.url) {
      setError(result.error ?? "שגיאה לא צפויה");
      setLoading(null);
      return;
    }
    window.location.href = result.url;
  };

  const handleManage = async () => {
    setLoading("manage");
    setError(null);

    const result = await createBillingPortalSession();
    if (result.error || !result.url) {
      setError(result.error ?? "שגיאה לא צפויה");
      setLoading(null);
      return;
    }
    window.location.href = result.url;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 font-orbitron text-4xl font-bold text-white">מנוי פרימיום</h1>
        <p className="text-lg text-neutral-400">הקטלוג נשאר חינמי לכולם - המנוי מוסיף קרדיטים ל-Studio והטבות</p>
      </div>

      {success && (
        <div className="mb-8 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
          <p className="text-green-400">המנוי הופעל בהצלחה</p>
        </div>
      )}
      {canceled && (
        <div className="mb-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
          <p className="text-yellow-400">התהליך בוטל</p>
        </div>
      )}
      {error && (
        <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {active && (
        <div className="mb-12 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6 text-center">
          <p className="mb-1 text-lg font-semibold text-white">המנוי הפעיל שלך: {active.planName}</p>
          {active.currentPeriodEnd && (
            <p className="text-sm text-neutral-400">
              {active.cancelAtPeriodEnd ? "יסתיים ב-" : "מתחדש ב-"}
              {new Date(active.currentPeriodEnd).toLocaleDateString("he-IL")}
            </p>
          )}
          <button
            onClick={() => void handleManage()}
            disabled={loading !== null}
            className="mt-4 rounded-xl bg-white/10 px-6 py-2 font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            {loading === "manage" ? "טוען..." : "נהל מנוי / בטל"}
          </button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isPopular = plan.interval === "monthly";
          const isCurrent = active?.planName === plan.name;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 transition-all hover:scale-[1.02] ${
                isPopular ? "border-cyan-500/50 bg-gradient-to-b from-cyan-500/10 to-transparent" : "border-white/10 bg-white/5"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-1 text-xs font-bold text-white">
                  הכי פופולרי
                </div>
              )}

              <div className="mb-4 text-center">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-white">₪{plan.priceNis}</span>
                  <span className="text-sm text-neutral-400"> {INTERVAL_LABELS[plan.interval]}</span>
                </div>
              </div>

              <ul className="mb-6 space-y-2 text-sm text-neutral-300">
                {plan.creditsPerPeriod > 0 && <li>{plan.creditsPerPeriod} קרדיטים</li>}
                {plan.adFree && <li>ללא פרסומות</li>}
                {plan.priorityQueue && <li>תור עדיפות ליצירה</li>}
                {plan.earlyAccess && <li>גישה מוקדמת לפיצ&apos;רים</li>}
                {plan.founderBadge && <li>תג תומך מייסד</li>}
              </ul>

              <button
                onClick={() => void handleSubscribe(plan.interval)}
                disabled={loading !== null || isCurrent || Boolean(active)}
                className={`w-full rounded-xl py-3 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  isPopular ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {isCurrent ? "המנוי הנוכחי שלך" : loading === plan.interval ? "טוען..." : "הירשם"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
