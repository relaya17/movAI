#!/usr/bin/env node
/**
 * Block `pnpm dev` on Render/CI/production hosts — dev mode compiles on the
 * fly, ignores Render's PORT, and exceeds the 512Mi free-tier RAM.
 * Use `pnpm start` / `pnpm start:web` after `pnpm build:web` instead.
 */
if (process.env.RENDER || process.env.CI) {
  console.error(
    [
      "",
      "ERROR: pnpm dev must not run on Render or CI.",
      "  Build:  pnpm build:web",
      "  Start:  pnpm start   (or pnpm start:web)",
      "",
      "Update the Render Start Command — it is currently set to `pnpm run dev`.",
      ""
    ].join("\n")
  );
  process.exit(1);
}
