/**
 * postgres.js (the driver behind both apps/api and apps/web's drizzle
 * clients) surfaces a Postgres error's SQLSTATE as `.code` on the thrown
 * error object. "23505" is `unique_violation`. Centralized here (instead of
 * each app redefining its own copy) since both a real race condition on
 * signup (packages/db consumers in apps/web) and idempotency guards on the
 * credit ledger (apps/api) need the exact same check.
 */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "23505";
}
