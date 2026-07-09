import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";
import { LoggingInterceptor } from "./logging.interceptor";

@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    // Explicit factory - useClass + APP_INTERCEPTOR was constructing the
    // interceptor without injecting MetricsService under tsx watch, so every
    // request that hit catchError crashed with "Cannot read properties of
    // undefined (reading 'recordRequest')" and hid the real handler error.
    {
      provide: APP_INTERCEPTOR,
      useFactory: (metrics: MetricsService) => new LoggingInterceptor(metrics),
      inject: [MetricsService]
    }
  ],
  exports: [MetricsService]
})
export class MonitoringModule {}
