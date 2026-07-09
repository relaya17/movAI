#!/usr/bin/env node
/**
 * Frees MoVAI local dev ports before starting turbo dev.
 * Stale node/next/nest processes from interrupted runs are the usual cause
 * of EADDRINUSE on 3100 (web) and 4100 (api).
 */
import { execSync } from "node:child_process";

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
