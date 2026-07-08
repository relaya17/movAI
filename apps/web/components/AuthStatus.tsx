import { auth, signOut } from "@/auth";
import { Button } from "@movai/ui";

/** Server component - reads the session directly, no client-side useSession/SessionProvider needed for this simple case. */
export async function AuthStatus(): Promise<React.ReactElement> {
  const session = await auth();

  if (!session?.user) {
    return (
      <a href="/sign-in" className="text-sm font-medium text-brand-600 hover:underline">
        התחברות
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-neutral-600 dark:text-neutral-300">
        {session.user.name ?? session.user.email}
      </span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button type="submit" variant="secondary" className="px-3 py-1 text-xs">
          התנתקות
        </Button>
      </form>
    </div>
  );
}
