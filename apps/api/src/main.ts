import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // API versioning (architecture plan §17.4) - breaking changes get /v2/,
  // /v1/ keeps working for at least 6 months per the documented policy.
  app.setGlobalPrefix("v1", { exclude: ["health"] });

  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3100" });

  // 4000/3000 are extremely common defaults (used by countless other local
  // dev tools), which is what caused the EADDRINUSE crash - 4100 collides
  // with far less on a typical dev machine.
  const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 4100;
  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start MoVAI API", error);
  process.exitCode = 1;
});
