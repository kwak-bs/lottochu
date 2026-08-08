import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
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
  implements ICommandHandler<GeneratePensionRecommendationCommand>
{
  private readonly logger = new Logger(
    GeneratePensionRecommendationHandler.name,
  );

  constructor(
    @InjectRepository(PensionRecommendation)
    private readonly recommendationRepository: Repository<PensionRecommendation>,
    private readonly pensionRecommendationRepository: PensionRecommendationRepository,
    private readonly statisticsService: StatisticsService,
  ) {}

  async execute(
    command: GeneratePensionRecommendationCommand,
  ): Promise<GeneratePensionRecommendationResult> {
    const { targetDrawId } = command;
    this.logger.log(
      `Generating pension recommendations for draw #${targetDrawId}`,
    );

    const existing =
      await this.pensionRecommendationRepository.findByDrawId(targetDrawId);
    if (existing.length > 0) {
      return this.toExistingResult(targetDrawId, existing);
    }

    const statisticalResults: {
      gameNumber: number;
      groupNo: number;
      digits: string;
    }[] = [];

    // 1순위 번호 1세트만 사용, 조 1~5 → 5게임 (5,000원)
    const rankedDigits =
      await this.statisticsService.getRecommendedPensionDigitsRanked();
    const digits = rankedDigits[0];
    this.logger.log(`Recommended digits (1st rank): ${digits}`);

    const toSave: PensionRecommendation[] = [];
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
      toSave.push(rec);
      statisticalResults.push({ gameNumber, groupNo, digits });
    }

    let recommendations: PensionRecommendation[];
    try {
      recommendations =
        await this.pensionRecommendationRepository.saveMany(toSave);
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;

      const concurrentlyCreated =
        await this.pensionRecommendationRepository.findByDrawId(targetDrawId);
      return this.toExistingResult(targetDrawId, concurrentlyCreated);
    }

    return {
      targetDrawId,
      recommendations,
      statistical: statisticalResults,
      ai: [], // 통계만 사용, AI 추천 없음
    };
  }

  private toExistingResult(
    targetDrawId: number,
    recommendations: PensionRecommendation[],
  ): GeneratePensionRecommendationResult {
    if (recommendations.length !== 5) {
      throw new Error(
        `Pension draw #${targetDrawId} has an incomplete recommendation set (${recommendations.length}/5)`,
      );
    }

    return {
      targetDrawId,
      recommendations,
      statistical: recommendations.map((recommendation) => ({
        gameNumber: recommendation.gameNumber,
        groupNo: recommendation.groupNo,
        digits: recommendation.digits,
      })),
      ai: [],
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    );
  }
}
