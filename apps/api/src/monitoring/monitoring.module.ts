import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";
import { LoggingInterceptor } from "./logging.interceptor";

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
  exports: [MetricsService]
})
export class MonitoringModule {}
