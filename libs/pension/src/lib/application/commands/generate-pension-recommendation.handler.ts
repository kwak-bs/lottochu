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

    // 순위별(1·2·3순위) 3세트 추천 — 해당 순위 숫자가 없으면 하위 순위/랜덤 폴백
    const rankedDigits = await this.statisticsService.getRecommendedPensionDigitsRanked();
    this.logger.log(
      `Recommended digits (ranked): 1st=${rankedDigits[0]}, 2nd=${rankedDigits[1]}, 3rd=${rankedDigits[2]}`,
    );

    // 15게임(15,000원): 1·2·3순위 번호 각각에 조 1~5 → 3×5 = 15게임
    let gameNumber = 0;
    for (let rank = 0; rank < 3; rank++) {
      const digits = rankedDigits[rank];
      for (let groupNo = 1; groupNo <= 5; groupNo++) {
        gameNumber++;
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
    }

    return {
      targetDrawId,
      recommendations,
      statistical: statisticalResults,
      ai: [], // 통계만 사용, AI 추천 없음
    };
  }
}
