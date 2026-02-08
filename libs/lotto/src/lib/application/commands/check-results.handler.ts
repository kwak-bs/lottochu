import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CheckResultsCommand } from './check-results.command';
import {
  DrawRepository,
  RecommendationRepository,
  ResultRepository,
} from '../../infrastructure/repositories';
import { Result } from '../../domain/entities';

/**
 * 개별 추천 결과
 */
export interface RecommendationResult {
  recommendationId: string;
  gameNumber: number;
  type: string;
  numbers: number[];
  matchedCount: number;
  matchedNumbers: number[];
  hasBonus: boolean;
  prizeRank: number | null;
}

/**
 * CheckResults Command 결과
 */
export interface CheckResultsResult {
  drawId: number;
  winningNumbers: number[];
  bonusNumber: number;
  results: RecommendationResult[];
  totalRecommendations: number;
  bestRank: number | null;
}

@CommandHandler(CheckResultsCommand)
export class CheckResultsHandler implements ICommandHandler<CheckResultsCommand> {
  private readonly logger = new Logger(CheckResultsHandler.name);

  constructor(
    private readonly drawRepository: DrawRepository,
    private readonly recommendationRepository: RecommendationRepository,
    private readonly resultRepository: ResultRepository,
  ) { }

  async execute(command: CheckResultsCommand): Promise<CheckResultsResult | null> {
    this.logger.log(`Checking results for draw #${command.drawId}...`);

    // 1. 당첨 번호 조회
    const draw = await this.drawRepository.findById(command.drawId);
    if (!draw) {
      this.logger.warn(`Draw #${command.drawId} not found`);
      return null;
    }

    // 2. 해당 회차 추천 조회
    const recommendations = await this.recommendationRepository.findByDrawId(command.drawId);
    if (recommendations.length === 0) {
      this.logger.warn(`No recommendations found for draw #${command.drawId}`);
      return null;
    }

    this.logger.log(`Found ${recommendations.length} recommendations for draw #${command.drawId}`);

    // 3. 각 추천에 대해 결과 계산 및 저장
    const results: RecommendationResult[] = [];
    let bestRank: number | null = null;

    for (const rec of recommendations) {
      // 이미 결과가 있는지 확인
      const existingResult = await this.resultRepository.exists(rec.id);
      if (existingResult) {
        this.logger.debug(`Result already exists for recommendation ${rec.id}`);
        continue;
      }

      // 일치 번호 계산
      const matchedNumbers = rec.numbers.filter((n) => draw.numbers.includes(n));
      const matchedCount = matchedNumbers.length;
      const hasBonus = rec.numbers.includes(draw.bonusNumber);

      // 당첨 등수 계산
      const prizeRank = this.calculatePrizeRank(matchedCount, hasBonus);

      // 결과 저장
      const result: Partial<Result> = {
        recommendationId: rec.id,
        matchedCount,
        matchedNumbers,
        hasBonus,
        prizeRank,
      };

      await this.resultRepository.save(result);

      // 결과 목록에 추가
      results.push({
        recommendationId: rec.id,
        gameNumber: rec.gameNumber,
        type: rec.type,
        numbers: rec.numbers,
        matchedCount,
        matchedNumbers,
        hasBonus,
        prizeRank,
      });

      // 최고 등수 업데이트
      if (prizeRank !== null && (bestRank === null || prizeRank < bestRank)) {
        bestRank = prizeRank;
      }

      this.logger.log(
        `Game ${rec.gameNumber} (${rec.type}): ${matchedCount} matched${prizeRank ? ` - ${prizeRank}등!` : ''}`,
      );
    }

    this.logger.log(`Result check completed. Best rank: ${bestRank || 'None'}`);

    return {
      drawId: command.drawId,
      winningNumbers: draw.numbers,
      bonusNumber: draw.bonusNumber,
      results,
      totalRecommendations: recommendations.length,
      bestRank,
    };
  }

  /**
   * 당첨 등수 계산
   * - 1등: 6개 일치
   * - 2등: 5개 일치 + 보너스
   * - 3등: 5개 일치
   * - 4등: 4개 일치
   * - 5등: 3개 일치
   */
  private calculatePrizeRank(matchedCount: number, hasBonus: boolean): number | null {
    if (matchedCount === 6) return 1;
    if (matchedCount === 5 && hasBonus) return 2;
    if (matchedCount === 5) return 3;
    if (matchedCount === 4) return 4;
    if (matchedCount === 3) return 5;
    return null;
  }
}
