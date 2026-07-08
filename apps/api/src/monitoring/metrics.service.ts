import { Injectable } from "@nestjs/common";

interface RouteStats {
  count: number;
  errorCount: number;
  totalDurationMs: number;
}

/**
 * Deliberately in-memory, no Prometheus client library (review finding:
 * "no metrics" - this is the minimum that actually answers "is the API
 * slow or erroring right now," not a full metrics stack). Per-process, not
 * shared across replicas - fine for the /metrics endpoint's purpose of
 * being scraped per-instance, same as a real Prometheus exporter would be.
 */
@Injectable()
export class MetricsService {
  private readonly routes = new Map<string, RouteStats>();

  recordRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    const key = `${method} ${route}`;
    const stats = this.routes.get(key) ?? { count: 0, errorCount: 0, totalDurationMs: 0 };
    stats.count += 1;
    stats.totalDurationMs += durationMs;
    if (statusCode >= 500) stats.errorCount += 1;
    this.routes.set(key, stats);
  }

  /** Prometheus text exposition format (https://prometheus.io/docs/instrumenting/exposition_formats/) - scrapeable as-is. */
  renderPrometheus(): string {
    const lines: string[] = [
      "# HELP movai_api_requests_total Total HTTP requests handled since process start",
      "# TYPE movai_api_requests_total counter",
      "# HELP movai_api_request_errors_total Total HTTP requests that returned a 5xx status",
      "# TYPE movai_api_request_errors_total counter",
      "# HELP movai_api_request_duration_ms_avg Average request duration in milliseconds",
      "# TYPE movai_api_request_duration_ms_avg gauge"
    ];

    for (const [key, stats] of this.routes) {
      const [method, ...routeParts] = key.split(" ");
      const route = routeParts.join(" ");
      const labels = `{method="${method}",route="${escapeLabel(route)}"}`;
      const avgDuration = stats.count > 0 ? stats.totalDurationMs / stats.count : 0;

      lines.push(`movai_api_requests_total${labels} ${stats.count}`);
      lines.push(`movai_api_request_errors_total${labels} ${stats.errorCount}`);
      lines.push(`movai_api_request_duration_ms_avg${labels} ${avgDuration.toFixed(2)}`);
    }

    return `${lines.join("\n")}\n`;
  }
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
