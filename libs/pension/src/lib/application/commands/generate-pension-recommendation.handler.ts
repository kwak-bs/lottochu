import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneratePensionRecommendationCommand } from './generate-pension-recommendation.command';
import {
  PensionRecommendation,
  PensionRecommendationType,
} from '../../domain/entities';
import { PensionRecommendationRepository } from '../../infrastructure/repositories';
import { StatisticsService } from '@lottochu/statistics';

export interface GeneratePensionRecommendationResult {
  targetDrawId: number;
  recommendations: PensionRecommendation[];
  statistical: PensionStatisticalRecommendationItem[];
  ai: PensionAiRecommendationItem[];
}

export interface PensionStatisticalRecommendationItem {
  gameNumber: number;
  groupNo: number;
  digits: string;
}

export interface PensionAiRecommendationItem {
  groupNo: number;
  digits: string;
  reasoning: string;
}

@CommandHandler(GeneratePensionRecommendationCommand)
export class GeneratePensionRecommendationHandler
  implements ICommandHandler<GeneratePensionRecommendationCommand> {
  private readonly logger = new Logger(GeneratePensionRecommendationHandler.name);

  constructor(
    @InjectRepository(PensionRecommendation)
    private readonly recommendationRepository: Repository<PensionRecommendation>,
    private readonly pensionRecommendationRepository: PensionRecommendationRepository,
    private readonly statisticsService: StatisticsService,
  ) { }

  async execute(
    command: GeneratePensionRecommendationCommand,
  ): Promise<GeneratePensionRecommendationResult> {
    const { targetDrawId } = command;
    this.logger.log(
      `Generating pension recommendations for draw #${targetDrawId}`,
    );

    const recommendations: PensionRecommendation[] = [];
    const statisticalResults: {
      gameNumber: number;
      groupNo: number;
      digits: string;
    }[] = [];

    // 1순위 번호 1세트만 사용, 조 1~5 → 5게임 (5,000원)
    const rankedDigits = await this.statisticsService.getRecommendedPensionDigitsRanked();
    const digits = rankedDigits[0];
    this.logger.log(`Recommended digits (1st rank): ${digits}`);

    for (let gameNumber = 1; gameNumber <= 5; gameNumber++) {
      const groupNo = gameNumber;
      const rec = this.recommendationRepository.create({
        targetDrawId,
        type: PensionRecommendationType.STATISTICAL,
        gameNumber,
        groupNo,
        digits,
        aiReasoning: null,
      });
      recommendations.push(
        await this.pensionRecommendationRepository.save(rec),
      );
      statisticalResults.push({ gameNumber, groupNo, digits });
    }

    return {
      targetDrawId,
      recommendations,
      statistical: statisticalResults,
      ai: [], // 통계만 사용, AI 추천 없음
    };
  }
}
