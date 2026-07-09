"use server";

import { auth } from "@/auth";
import { stripe } from "./stripe";
import { db } from "./db";
import { getPlanByInterval, getActiveSubscription, type SubscriptionInterval } from "@movai/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";

export interface CreateCheckoutResult {
  url: string;
  error?: never;
}

export interface CreateCheckoutError {
  url?: never;
  error: string;
}

/**
 * Create a Stripe Checkout session for a subscription tier (day/week/month/
 * year - see @movai/db subscriptionPlans). Unlike createCheckoutSession()
 * (payment-actions.ts, one-time credit purchases), this uses `mode:
 * "subscription"` against the plan's pre-created recurring Stripe Price
 * (`stripePriceId` - see scripts/seed-subscription-plans.ts), not an
 * inline price_data - Stripe requires a real recurring Price object for
 * subscription mode, it can't be built ad hoc per checkout the way a
 * one-time payment's price_data can.
 */
export async function createSubscriptionCheckoutSession(
  interval: SubscriptionInterval
): Promise<CreateCheckoutResult | CreateCheckoutError> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "יש להתחבר כדי לרכוש מנוי" };
  }

  const plan = await getPlanByInterval(db, interval);
  if (!plan || plan.isActive !== 1) {
    return { error: "מסלול מנוי לא נמצא" };
  }
  if (!plan.stripePriceId) {
    return { error: "מסלול זה עדיין לא זמין לרכישה" };
  }

  const existing = await getActiveSubscription(db, session.user.id);
  if (existing) {
    return { error: "כבר יש לך מנוי פעיל - בטלי אותו לפני מעבר למסלול אחר" };
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${APP_URL}/pricing/subscription?success=true`,
      cancel_url: `${APP_URL}/pricing/subscription?canceled=true`,
      ...(session.user.email ? { customer_email: session.user.email } : {}),
      metadata: { userId: session.user.id, planId: plan.id },
      subscription_data: { metadata: { userId: session.user.id, planId: plan.id } }
    });

    return { url: checkoutSession.url ?? `${APP_URL}/pricing/subscription` };
  } catch (error) {
    console.error("Stripe subscription checkout error:", error);
    return { error: "שגיאה ביצירת עמוד תשלום" };
  }
}

/**
 * Stripe's own hosted billing portal - cancellation, payment-method
 * updates and invoice history are handled entirely by Stripe there instead
 * of this app reimplementing that UI. Requires a `stripeCustomerId` on an
 * existing (even canceled) subscription row.
 */
export async function createBillingPortalSession(): Promise<CreateCheckoutResult | CreateCheckoutError> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "יש להתחבר" };
  }

  const active = await getActiveSubscription(db, session.user.id);
  if (!active?.subscription.stripeCustomerId) {
    return { error: "לא נמצא מנוי פעיל" };
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: active.subscription.stripeCustomerId,
    return_url: `${APP_URL}/pricing/subscription`
  });

  return { url: portalSession.url };
}
