/**
 * Single-operator admin check - MoVAI has no roles/permissions system (no
 * `isAdmin` column, no admin table), and doesn't need one yet for a site
 * with one owner. `ADMIN_EMAILS` is a comma-separated allowlist, checked
 * against the signed-in session's email - the same "small env-var allowlist
 * instead of a full auth subsystem" pattern apps/api's admin module already
 * uses for `ADMIN_API_KEY`. If this ever needs to support multiple
 * independent admins with different permissions, that's the point to build
 * a real role column instead of growing this list.
 */
export function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
