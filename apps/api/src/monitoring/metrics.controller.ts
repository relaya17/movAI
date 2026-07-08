import { Controller, Get, Header } from "@nestjs/common";
import { MetricsService } from "./metrics.service";

/** GET /metrics (excluded from /v1 like /health - see main.ts) - Prometheus scrape target. */
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4")
  getMetrics(): string {
    return this.metrics.renderPrometheus();
  }
}
