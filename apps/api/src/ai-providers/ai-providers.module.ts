import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ReplicateService } from "./replicate.service";
import { SunoService } from "./suno.service";
import { ElevenLabsService } from "./elevenlabs.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ReplicateService, SunoService, ElevenLabsService],
  exports: [ReplicateService, SunoService, ElevenLabsService],
})
export class AIProvidersModule {}
