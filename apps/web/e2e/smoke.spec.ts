import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // Landing CTAs appear after the promo (or immediately with reduced motion).
    await expect(page.getByRole("link", { name: /התחברות|Sign in/i })).toBeVisible({ timeout: 20_000 });
  });

  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });

  test("browse redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/browse");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("movie page loads from mock catalog", async ({ page }) => {
    // Mock catalog slug from lib/movies.ts - available when DB is empty/unreachable.
    // CI cold-compiles this route on next dev; allow time for first paint.
    await page.goto("/movie/night-of-the-living-dead-1968", { waitUntil: "domcontentloaded" });
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible({ timeout: 30_000 });
    await expect(heading).toContainText(/Night of the Living Dead|Living Dead/i, { timeout: 30_000 });
  });
});
