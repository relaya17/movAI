import { listUsersDueForOnboardingDrip, logOnboardingDripSent, type Database } from "@movai/db";

export interface OnboardingEmailSender {
  sendDripEmail(to: string, name: string | null, dripDay: 3 | 7): Promise<void>;
}

/** Send day-3 / day-7 onboarding tips to users in the drip window. */
export async function processOnboardingDrip(
  db: Database,
  dripDay: 3 | 7,
  sender: OnboardingEmailSender
): Promise<number> {
  const candidates = await listUsersDueForOnboardingDrip(db, dripDay);
  let sent = 0;

  for (const user of candidates) {
    if (!user.email) continue;
    try {
      await sender.sendDripEmail(user.email, user.name, dripDay);
      await logOnboardingDripSent(db, user.id, dripDay);
      sent++;
    } catch (error) {
      console.error(`[onboarding] drip day ${dripDay} failed for ${user.id}`, error);
    }
  }

  return sent;
}
