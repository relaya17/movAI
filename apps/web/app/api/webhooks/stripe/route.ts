import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, StripeNotConfiguredError } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  grantPurchasedCredits,
  grantSubscriptionCredits,
  markPaymentCompleted,
  markPaymentExpired,
  upsertSubscriptionFromStripe,
  getPlanById,
  isUniqueViolation
} from "@movai/db";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      console.error("STRIPE_SECRET_KEY not configured");
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }
    throw error;
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription") {
        await handleSubscriptionCheckoutCompleted(session, stripe);
      } else {
        await handleCreditPurchaseCompleted(session);
      }
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { paymentId } = session.metadata ?? {};
      if (paymentId) await markPaymentExpired(db, paymentId);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice, stripe);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionStatusChange(subscription);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

/**
 * One-time credit-package purchase (mode "payment") - previously hand-rolled
 * its own balance/ledger update directly in this file instead of calling
 * the shared, idempotency-protected repository functions
 * (grantPurchasedCredits/markPaymentCompleted, @movai/db). That meant a
 * Stripe-redelivered webhook event could double-credit a user, since
 * nothing here guarded against processing the same event twice. Routing
 * through grantPurchasedCredits (keyed on paymentId via the
 * (userId, referenceId, type) unique index) closes that gap for free.
 */
async function handleCreditPurchaseCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { userId, paymentId, credits } = session.metadata ?? {};

  if (!userId || !paymentId || !credits) {
    console.error("Missing metadata in checkout session:", session.id);
    return;
  }

  const creditsAmount = Number.parseInt(credits, 10);

  try {
    await markPaymentCompleted(db, paymentId, {
      stripeSessionId: session.id,
      stripePaymentIntent: session.payment_intent
    });

    try {
      await grantPurchasedCredits(db, userId, creditsAmount, paymentId);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      console.log(`Credit purchase ${paymentId} already granted - skipping duplicate webhook delivery`);
    }

    console.log(`Credits added: ${creditsAmount} for user ${userId}`);
  } catch (error) {
    console.error("Error processing checkout completion:", error);
  }
}

/**
 * Subscription checkout completed - creates the initial userSubscriptions
 * row. The *first* period's credits are granted here from the checkout
 * session itself rather than waiting for "invoice.paid" (Stripe does also
 * fire an invoice.paid for the first period, but relying on two different
 * event types to both correctly fire, in order, for the very first grant is
 * more fragile than just granting it here and letting invoice.paid own
 * every *subsequent* renewal only).
 */
async function handleSubscriptionCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe
): Promise<void> {
  const { userId, planId } = session.metadata ?? {};
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!userId || !planId || !stripeSubscriptionId) {
    console.error("Missing metadata/subscription in checkout session:", session.id);
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const plan = await getPlanById(db, planId);
    if (!plan) {
      console.error(`Subscription checkout completed for unknown planId ${planId}`);
      return;
    }

    const { periodStart, periodEnd } = readSubscriptionPeriod(subscription);

    await upsertSubscriptionFromStripe(db, {
      userId,
      planId,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? ""),
      stripeSubscriptionId,
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });

    if (plan.creditsPerPeriod > 0) {
      const periodReferenceId = `${stripeSubscriptionId}:${periodStart.toISOString()}`;
      try {
        await grantSubscriptionCredits(db, userId, plan.creditsPerPeriod, periodReferenceId);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        console.log(`Subscription period ${periodReferenceId} already granted - skipping duplicate webhook delivery`);
      }
    }

    console.log(`Subscription started: user ${userId}, plan ${plan.interval}`);
  } catch (error) {
    console.error("Error processing subscription checkout completion:", error);
  }
}

/** Every renewal after the first (see handleSubscriptionCheckoutCompleted above for why the first is granted separately). */
async function handleInvoicePaid(invoice: Stripe.Invoice, stripe: Stripe): Promise<void> {
  // Stripe API 2025-03-31+ moved the subscription id off Invoice.subscription
  // onto Invoice.parent.subscription_details.subscription.
  const parentSubscription = invoice.parent?.subscription_details?.subscription;
  const stripeSubscriptionId =
    typeof parentSubscription === "string" ? parentSubscription : parentSubscription?.id;
  if (!stripeSubscriptionId) return; // Not a subscription invoice (e.g. a one-off invoice item) - nothing to do here.

  // "billing_reason: subscription_create" is the very first invoice for a
  // brand-new subscription, already granted by handleSubscriptionCheckoutCompleted -
  // only *renewal* invoices should grant here, or the first period double-grants.
  if (invoice.billing_reason === "subscription_create") return;

  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const { userId, planId } = subscription.metadata ?? {};
    if (!userId || !planId) {
      console.error(`Subscription ${stripeSubscriptionId} has no userId/planId metadata`);
      return;
    }

    const plan = await getPlanById(db, planId);
    if (!plan) return;

    const { periodStart, periodEnd } = readSubscriptionPeriod(subscription);

    await upsertSubscriptionFromStripe(db, {
      userId,
      planId,
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripeSubscriptionId,
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });

    if (plan.creditsPerPeriod > 0) {
      const periodReferenceId = `${stripeSubscriptionId}:${periodStart.toISOString()}`;
      try {
        await grantSubscriptionCredits(db, userId, plan.creditsPerPeriod, periodReferenceId);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        console.log(`Subscription period ${periodReferenceId} already granted - skipping duplicate webhook delivery`);
      }
    }
  } catch (error) {
    console.error("Error processing subscription renewal:", error);
  }
}

/** Covers cancellation, payment failure (past_due), and any other Stripe-side status change. */
async function handleSubscriptionStatusChange(subscription: Stripe.Subscription): Promise<void> {
  const { userId, planId } = subscription.metadata ?? {};
  if (!userId || !planId) return;

  try {
    const { periodStart, periodEnd } = readSubscriptionPeriod(subscription);
    await upsertSubscriptionFromStripe(db, {
      userId,
      planId,
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });
  } catch (error) {
    console.error("Error processing subscription status change:", error);
  }
}

/** Stripe has more granular statuses (trialing, unpaid, incomplete_expired...) than our own schema needs - collapse to the 4 we act on. */
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): "active" | "canceled" | "past_due" | "incomplete" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    case "paused":
      return "incomplete";
  }
}

/**
 * Recent Stripe API versions moved period_start/period_end off the
 * Subscription object itself and onto each subscription item - read from
 * `items.data[0]` first and fall back to the (still present in stripe-node's
 * types for backward compatibility) top-level fields, rather than assuming
 * either shape unconditionally.
 */
function readSubscriptionPeriod(subscription: Stripe.Subscription): { periodStart: Date; periodEnd: Date } {
  const item = subscription.items.data[0];
  const startSeconds = item?.current_period_start ?? (subscription as unknown as { current_period_start?: number }).current_period_start;
  const endSeconds = item?.current_period_end ?? (subscription as unknown as { current_period_end?: number }).current_period_end;

  return {
    periodStart: startSeconds ? new Date(startSeconds * 1000) : new Date(),
    periodEnd: endSeconds ? new Date(endSeconds * 1000) : new Date()
  };
}
