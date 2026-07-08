import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/profile/ProfileClient";

export const metadata = {
  title: "הפרופיל שלי | MoVAI",
  description: "צפה ונהל את הפרופיל האישי שלך",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return <ProfileClient user={session.user} />;
}
