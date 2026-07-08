import { Module } from "@nestjs/common";
import { StudioController } from "./studio.controller";
import { StudioService } from "./studio.service";
import { CreditsModule } from "../credits/credits.module";

@Module({
  imports: [CreditsModule],
  controllers: [StudioController],
  providers: [StudioService],
  exports: [StudioService],
})
export class StudioModule {}
