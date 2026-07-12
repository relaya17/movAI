#!/usr/bin/env node
/**
 * Local: turbo dev (web + api).
 * Render: many dashboards still have Start Command = `pnpm run dev` — run
 * production `next start` instead so PORT binding and 512Mi limits work.
 */
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  process.exit(result.status ?? 1);
}

if (process.env.RENDER) {
  console.warn(
    [
      "",
      "RENDER detected — Start Command is `pnpm dev` but production is required.",
      "Running `pnpm --filter @movai/web start` (next start on $PORT).",
      "Tip: change Render Start Command to `pnpm start` when you can.",
      ""
    ].join("\n")
  );
  run("pnpm", ["--filter", "@movai/web", "start"]);
}

run("turbo", ["run", "dev"]);
