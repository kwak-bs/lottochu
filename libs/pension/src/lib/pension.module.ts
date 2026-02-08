import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import {
  PensionDraw,
  PensionRecommendation,
  PensionResult,
} from './domain/entities';
import {
  PensionDrawRepository,
  PensionRecommendationRepository,
  PensionResultRepository,
} from './infrastructure/repositories';
import {
  SyncPensionDrawsHandler,
  GeneratePensionRecommendationHandler,
  CheckPensionResultsHandler,
} from './application/commands';
import { PensionController } from './interfaces';
import { SharedModule } from '@lottochu/shared';
import { StatisticsModule } from '@lottochu/statistics';
import { TelegramModule } from '@lottochu/telegram';

const CommandHandlers = [
  SyncPensionDrawsHandler,
  GeneratePensionRecommendationHandler,
  CheckPensionResultsHandler,
];
const Repositories = [
  PensionDrawRepository,
  PensionRecommendationRepository,
  PensionResultRepository,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      PensionDraw,
      PensionRecommendation,
      PensionResult,
    ]),
    SharedModule,
    StatisticsModule,
    TelegramModule,
  ],
  controllers: [PensionController],
  providers: [...CommandHandlers, ...Repositories],
  exports: [TypeOrmModule, ...Repositories],
})
export class PensionModule { }
