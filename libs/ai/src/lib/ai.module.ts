import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OllamaClient } from './ollama.client';
import { AiService } from './ai.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
    }),
  ],
  providers: [OllamaClient, AiService],
  exports: [AiService, OllamaClient],
})
export class AiModule {}
