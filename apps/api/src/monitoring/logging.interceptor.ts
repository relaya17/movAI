import { Injectable, Logger, type NestInterceptor, type ExecutionContext, type CallHandler } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { Observable, tap, catchError, throwError } from "rxjs";
import { MetricsService } from "./metrics.service";
import { captureError } from "./alerting";

/**
 * Global interceptor (review finding: "no correlation IDs, no
 * latency/throughput tracking"). Two things per request:
 *  1. Assigns/propagates an `X-Correlation-Id` so one request's log lines
 *     (and, if it fails, its Sentry event) can be tied together across
 *     services - honors an inbound header if the caller already set one
 *     (e.g. apps/web forwarding its own request id), generates one otherwise.
 *  2. Feeds MetricsService so /metrics has real throughput/error/latency
 *     numbers instead of only ever reporting zero requests.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const correlationId = (request.headers["x-correlation-id"] as string | undefined) ?? randomUUID();
    response.setHeader("X-Correlation-Id", correlationId);

    const start = Date.now();
    const method = request.method;
    // Route path template (e.g. "/v1/studio/creations/:id"), not the raw
    // URL - grouping by template keeps metrics/log volume bounded instead
    // of creating a new series per unique id.
    const route = (request.route as { path?: string } | undefined)?.path ?? request.path;
    // Capture for RxJS callbacks - under tsx/watch the interceptor `this`
    // can be undefined inside catchError, which turned every real handler
    // failure into a secondary "Cannot read properties of undefined
    // (reading 'recordRequest')" 500 and hid the original error.
    const metrics = this.metrics;
    const logger = this.logger;

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        const statusCode = response.statusCode;
        metrics.recordRequest(method, route, statusCode, durationMs);
        logger.log(`[${correlationId}] ${method} ${route} ${statusCode} ${durationMs}ms`);
      }),
      catchError((error: unknown) => {
        const durationMs = Date.now() - start;
        // Errors here still resolve to whatever status the exception filter
        // maps them to (typically already set on `response` by the time
        // this fires for most Nest exception types) - 500 is the safe
        // fallback for metrics purposes when it isn't.
        const statusCode = response.statusCode >= 400 ? response.statusCode : 500;
        metrics.recordRequest(method, route, statusCode, durationMs);
        logger.error(`[${correlationId}] ${method} ${route} ${statusCode} ${durationMs}ms - ${String(error)}`);
        captureError(error, { correlationId, method, route });
        return throwError(() => error);
      })
    );
  }
}
