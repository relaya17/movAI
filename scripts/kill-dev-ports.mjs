#!/usr/bin/env node
/**
 * Frees MoVAI local dev ports before starting turbo dev.
 * Stale node/next/nest processes from interrupted runs are the usual cause
 * of EADDRINUSE on 3100 (web) and 4100 (api).
 *
 * Also removes a production `next build` output from apps/web/.next when
 * present (BUILD_ID marker). Running `next dev` on top of that cache makes
 * /_next/static/* return 404 HTML and the app loads with no JS/CSS.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Hosted runtimes (Render, CI) must use `pnpm start`, not `pnpm dev`.
if (process.env.RENDER || process.env.CI) {
  console.log("Skipping local dev port cleanup on hosted runtime.");
  process.exit(0);
}

const nextDir = path.join(repoRoot, "apps", "web", ".next");
const productionBuildMarker = path.join(nextDir, "BUILD_ID");
const isHostedRuntime = Boolean(process.env.RENDER || process.env.CI || process.env.NODE_ENV === "production");

if (!isHostedRuntime && fs.existsSync(productionBuildMarker)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed production .next output — dev needs a fresh compile.");
}

const DEV_PORTS = [3100, 4100];

function killPortWindows(port) {
  try {
    const output = execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );

    for (const line of output.split(/\r?\n/)) {
      const pid = Number.parseInt(line.trim(), 10);
      if (!pid || pid === process.pid) continue;
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Freed port ${port} (PID ${pid})`);
      } catch {
        // Process may have already exited.
      }
    }
  } catch {
    // No listeners on this port.
  }
}

function killPortUnix(port) {
  try {
    const output = execSync(`lsof -ti :${port}`, { encoding: "utf8" });
    for (const line of output.split(/\r?\n/)) {
      const pid = Number.parseInt(line.trim(), 10);
      if (!pid || pid === process.pid) continue;
      try {
        execSync(`kill -9 ${pid}`, { stdio: "ignore" });
        console.log(`Freed port ${port} (PID ${pid})`);
      } catch {
        // Process may have already exited.
      }
    }
  } catch {
    // No listeners on this port.
  }
}

const killPort = process.platform === "win32" ? killPortWindows : killPortUnix;

for (const port of DEV_PORTS) {
  killPort(port);
}

console.log(`Dev ports ready: ${DEV_PORTS.join(", ")}`);
