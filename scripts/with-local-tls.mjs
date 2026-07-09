#!/usr/bin/env node
/**
 * Root-cause fix for local HTTPS on Windows machines with Avast/AVG
 * Web Shield (or similar TLS-intercepting antivirus).
 *
 * Symptom: Node/pnpm/Next fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE against
 * registry.npmjs.org, Cloudinary, etc. Windows trusts the Avast root CA;
 * Node's bundled Mozilla CA store does not — unless we point it at the
 * antivirus cert via NODE_EXTRA_CA_CERTS.
 *
 * Usage: node scripts/with-local-tls.mjs <command> [...args]
 * Example: node scripts/with-local-tls.mjs pnpm exec turbo run dev
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const CANDIDATE_CA_PATHS = [
  process.env.MOVAI_EXTRA_CA_CERTS,
  // Avast Web/Mail Shield (confirmed on this machine)
  "C:\\ProgramData\\Avast Software\\Avast\\wscert.pem",
  "C:\\Program Files\\Avast Software\\Suite\\local.crt",
  // AVG (same engine / similar layout)
  "C:\\ProgramData\\AVG\\Antivirus\\wscert.pem",
  "C:\\Program Files\\AVG\\Antivirus\\wscert.pem"
].filter((value) => typeof value === "string" && value.length > 0);

function resolveExtraCaCerts() {
  if (process.env.NODE_EXTRA_CA_CERTS && existsSync(process.env.NODE_EXTRA_CA_CERTS)) {
    return process.env.NODE_EXTRA_CA_CERTS;
  }
  for (const candidate of CANDIDATE_CA_PATHS) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

const [, , command, ...args] = process.argv;
if (!command) {
  console.error("Usage: node scripts/with-local-tls.mjs <command> [...args]");
  process.exit(1);
}

const caPath = resolveExtraCaCerts();
const env = { ...process.env };
if (caPath) {
  env.NODE_EXTRA_CA_CERTS = caPath;
  // Prefer trusting the real intercepting CA over disabling verification.
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    delete env.NODE_TLS_REJECT_UNAUTHORIZED;
  }
}

const child = spawn(command, args, {
  env,
  stdio: "inherit",
  shell: true,
  cwd: resolve(import.meta.dirname, "..")
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
