import { Module } from "@nestjs/common";
import { CreditsController } from "./credits.controller";
import { CreditsService } from "./credits.service";
import { InfraModule } from "../infra/infra.module";

@Module({
  imports: [InfraModule],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
