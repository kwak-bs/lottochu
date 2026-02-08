import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Draw, Recommendation, Result } from './domain/entities';
import {
  DrawRepository,
  RecommendationRepository,
  ResultRepository,
} from './infrastructure/repositories';
import {
  SyncDrawsHandler,
  GenerateRecommendationHandler,
  CheckResultsHandler,
} from './application/commands';
import { LottoController } from './interfaces';
import { SharedModule } from '@lottochu/shared';
import { StatisticsModule } from '@lottochu/statistics';
import { AiModule } from '@lottochu/ai';
import { TelegramModule } from '@lottochu/telegram';

const CommandHandlers = [SyncDrawsHandler, GenerateRecommendationHandler, CheckResultsHandler];
const Repositories = [DrawRepository, RecommendationRepository, ResultRepository];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Draw, Recommendation, Result]),
    SharedModule,
    StatisticsModule,
    AiModule,
    TelegramModule,
  ],
  controllers: [LottoController],
  providers: [...CommandHandlers, ...Repositories],
  exports: [TypeOrmModule, ...Repositories],
})
export class LottoModule { }
