import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { creditBalances, creditTransactions, payments } from "@movai/db";
import { eq, sql } from "drizzle-orm";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
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

  // Handle the event - we only handle specific events, ignore others
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutExpired(session);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, paymentId, credits } = session.metadata ?? {};

  if (!userId || !paymentId || !credits) {
    console.error("Missing metadata in checkout session:", session.id);
    return;
  }

  const creditsAmount = parseInt(credits, 10);

  try {
    // Update payment status
    await db
      .update(payments)
      .set({
        status: "completed",
        completedAt: new Date(),
        metadata: JSON.stringify({
          stripeSessionId: session.id,
          stripePaymentIntent: session.payment_intent,
        }),
      })
      .where(eq(payments.id, paymentId));

    // Check if user has a credit balance record
    const [existingBalance] = await db
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId))
      .limit(1);

    if (existingBalance) {
      // Update existing balance
      await db
        .update(creditBalances)
        .set({
          balance: sql`${creditBalances.balance} + ${creditsAmount}`,
          totalPurchased: sql`${creditBalances.totalPurchased} + ${creditsAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(creditBalances.userId, userId));
    } else {
      // Create new balance record
      await db.insert(creditBalances).values({
        userId,
        balance: creditsAmount,
        totalPurchased: creditsAmount,
        totalUsed: 0,
      });
    }

    // Get the new balance for the transaction record
    const [newBalance] = await db
      .select({ balance: creditBalances.balance })
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId))
      .limit(1);

    // Log the transaction
    await db.insert(creditTransactions).values({
      userId,
      type: "purchase",
      amount: creditsAmount,
      balanceAfter: newBalance?.balance ?? creditsAmount,
      description: `רכישת ${creditsAmount} קרדיטים`,
      referenceId: paymentId,
    });

    console.log(`Credits added: ${creditsAmount} for user ${userId}`);
  } catch (error) {
    console.error("Error processing checkout completion:", error);
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const { paymentId } = session.metadata ?? {};

  if (!paymentId) {
    return;
  }

  try {
    await db
      .update(payments)
      .set({ status: "expired" })
      .where(eq(payments.id, paymentId));
  } catch (error) {
    console.error("Error handling checkout expiration:", error);
  }
}
