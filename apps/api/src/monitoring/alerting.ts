import { Logger } from "@nestjs/common";
import * as Sentry from "@sentry/node";

/**
 * Thin, optional wrapper around Sentry (review finding: "no monitoring,
 * metrics or tracing - failures are silently swallowed"). Every call here
 * is safe to make whether or not SENTRY_DSN is configured: with no DSN,
 * `Sentry.init` is simply never called, and `Sentry.captureException`/
 * `captureMessage` on an uninitialized SDK are documented no-ops - so this
 * degrades to "just logs loudly," never throws, in local/dev environments.
 */
const logger = new Logger("Alerting");
let initialized = false;

export function initSentry(processName: "api" | "worker"): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.warn("SENTRY_DSN not set - errors will only be logged locally, not reported to Sentry.");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    initialScope: { tags: { process: processName } }
  });
  initialized = true;
  logger.log(`Sentry initialized for process "${processName}".`);
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message, error instanceof Error ? error.stack : undefined);

  if (initialized) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }
}

/** For "something is wrong" events that aren't a thrown Error - e.g. a job landing in the dead-letter queue. */
export function captureMessage(message: string, context?: Record<string, unknown>): void {
  logger.error(`ALERT: ${message}${context ? ` ${JSON.stringify(context)}` : ""}`);

  if (initialized) {
    Sentry.captureMessage(message, context ? { level: "error", extra: context } : { level: "error" });
  }
}
