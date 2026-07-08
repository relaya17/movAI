"use server";

import { auth } from "@/auth";
import { stripe } from "./stripe";
import { db } from "./db";
import { creditPackages, payments } from "@movai/db";
import { eq } from "drizzle-orm";

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
 * Create a Stripe Checkout session for purchasing a credit package.
 */
export async function createCheckoutSession(
  packageId: string
): Promise<CreateCheckoutResult | CreateCheckoutError> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "יש להתחבר כדי לרכוש קרדיטים" };
  }

  // Get the package details
  const [pkg] = await db
    .select()
    .from(creditPackages)
    .where(eq(creditPackages.id, packageId))
    .limit(1);

  if (!pkg || pkg.isActive !== 1) {
    return { error: "חבילה לא נמצאה" };
  }

  const totalCredits = pkg.credits + pkg.bonusCredits;
  const priceInAgorot = Math.round(parseFloat(pkg.priceNis) * 100);

  try {
    // Create payment record in pending status
    const [payment] = await db
      .insert(payments)
      .values({
        userId: session.user.id,
        packageId: pkg.id,
        provider: "stripe",
        amountNis: pkg.priceNis,
        amountUsd: pkg.priceUsd,
        creditsGranted: totalCredits,
        status: "pending",
      })
      .returning();

    if (!payment) {
      return { error: "שגיאה ביצירת רשומת תשלום" };
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "ils",
            product_data: {
              name: `${pkg.name} - ${totalCredits} קרדיטים`,
              description: pkg.bonusCredits > 0
                ? `${pkg.credits} קרדיטים + ${pkg.bonusCredits} בונוס`
                : `${pkg.credits} קרדיטים`,
            },
            unit_amount: priceInAgorot,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${APP_URL}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/pricing?canceled=true`,
      ...(session.user.email ? { customer_email: session.user.email } : {}),
      metadata: {
        userId: session.user.id,
        packageId: pkg.id,
        paymentId: payment.id,
        credits: totalCredits.toString(),
      },
    });

    // Update payment with Stripe session ID
    await db
      .update(payments)
      .set({ providerPaymentId: checkoutSession.id })
      .where(eq(payments.id, payment.id));

    return { url: checkoutSession.url ?? `${APP_URL}/pricing` };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return { error: "שגיאה ביצירת עמוד תשלום" };
  }
}

/**
 * Verify a checkout session and return status.
 */
export async function verifyCheckoutSession(
  sessionId: string
): Promise<{ success: boolean; credits?: number }> {
  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.payment_status === "paid") {
      const credits = parseInt(checkoutSession.metadata?.credits ?? "0", 10);
      return { success: true, credits };
    }

    return { success: false };
  } catch {
    return { success: false };
  }
}
