import Link from "next/link";
import { signIn } from "@/auth";
import { Button } from "@movai/ui";

const buttonBase =
  "flex w-full items-center justify-center text-center rounded-full px-5 py-3 text-base font-semibold";

export function AuthButtons(): React.ReactElement {
  return (
    <div className="relative z-20 flex w-full max-w-[18rem] flex-col gap-3 sm:max-w-xs">
      <Button
        asChild
        className={`${buttonBase} border border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20`}
      >
        <Link href="/sign-in">התחברות</Link>
      </Button>

      <Button
        asChild
        className={`${buttonBase} border border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20`}
      >
        <Link href="/sign-up">הרשמה</Link>
      </Button>

      <form
        className="w-full"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <Button type="submit" className={`${buttonBase} bg-white text-neutral-900 shadow-lg hover:bg-neutral-100`}>
          המשך עם Google
        </Button>
      </form>
    </div>
  );
}
