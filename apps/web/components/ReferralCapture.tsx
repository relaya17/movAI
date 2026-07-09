"use client";

import { useEffect } from "react";
import { applyReferralFromCookieAction } from "@/lib/referral-actions";

/** Applies ?ref= cookie once after OAuth or first session (httpOnly cookie). */
export function ReferralCapture(): null {
  useEffect(() => {
    void applyReferralFromCookieAction();
  }, []);
  return null;
}
