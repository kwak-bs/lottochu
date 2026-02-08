import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CheckPensionResultsCommand } from './check-pension-results.command';
import {
  PensionDrawRepository,
  PensionRecommendationRepository,
  PensionResultRepository,
} from '../../infrastructure/repositories';
import { PensionResult } from '../../domain/entities';

export interface PensionRecommendationResult {
  recommendationId: string;
  gameNumber: number;
  type: string;
  groupNo: number;
  digits: string;
  prizeRank: number | null;
}

export interface CheckPensionResultsResult {
  drawId: number;
  winningGroupNo: number | null;
  winningDigits: string | null;
  results: PensionRecommendationResult[];
  totalRecommendations: number;
  bestRank: number | null;
}

@CommandHandler(CheckPensionResultsCommand)
export class CheckPensionResultsHandler
  implements ICommandHandler<CheckPensionResultsCommand>
{
  private readonly logger = new Logger(CheckPensionResultsHandler.name);

  constructor(
    private readonly pensionDrawRepository: PensionDrawRepository,
    private readonly pensionRecommendationRepository: PensionRecommendationRepository,
    private readonly pensionResultRepository: PensionResultRepository,
  ) {}

  async execute(
    command: CheckPensionResultsCommand,
  ): Promise<CheckPensionResultsResult | null> {
    this.logger.log(
      `Checking pension results for draw #${command.drawId}...`,
    );

    const draw = await this.pensionDrawRepository.findById(command.drawId);
    if (!draw) {
      this.logger.warn(`Pension draw #${command.drawId} not found`);
      return null;
    }

    const recommendations =
      await this.pensionRecommendationRepository.findByDrawId(command.drawId);
    if (recommendations.length === 0) {
      this.logger.warn(
        `No pension recommendations found for draw #${command.drawId}`,
      );
      return null;
    }

    const results: PensionRecommendationResult[] = [];
    let bestRank: number | null = null;

    for (const rec of recommendations) {
      const existing = await this.pensionResultRepository.exists(rec.id);
      if (existing) continue;

      const prizeRank = this.calculatePensionPrizeRank(
        rec.groupNo,
        rec.digits,
        draw.groupNo,
        draw.digits,
      );

      await this.pensionResultRepository.save({
        recommendationId: rec.id,
        prizeRank,
      });

      results.push({
        recommendationId: rec.id,
        gameNumber: rec.gameNumber,
        type: rec.type,
        groupNo: rec.groupNo,
        digits: rec.digits,
        prizeRank,
      });

      if (
        prizeRank != null &&
        (bestRank == null || prizeRank < bestRank)
      ) {
        bestRank = prizeRank;
      }
    }

    return {
      drawId: command.drawId,
      winningGroupNo: draw.groupNo,
      winningDigits: draw.digits,
      results,
      totalRecommendations: recommendations.length,
      bestRank,
    };
  }

  /**
   * 연금복권 당첨 등수
   * 1등: 조+6자리 전부 일치, 2등: 앞5자리, 3등: 앞4자리, 4등: 앞3자리, 5등: 앞2자리, 6등: 앞1자리, 7등: 끝1자리, 8등: 보너스
   * 당첨번호 미제공 시 null 반환
   */
  private calculatePensionPrizeRank(
    recGroup: number,
    recDigits: string,
    winGroup: number | null,
    winDigits: string | null,
  ): number | null {
    if (winDigits == null || winDigits.length !== 6) return null;
    if (recDigits.length !== 6) return null;

    const fullMatch =
      winGroup != null &&
      recGroup === winGroup &&
      recDigits === winDigits;
    if (fullMatch) return 1;

    // 2~7등: 끝 N자리 일치 (2등=끝5자리, 3등=끝4자리, ..., 7등=끝1자리)
    for (let len = 5; len >= 1; len--) {
      const recSuffix = recDigits.slice(-len);
      const winSuffix = winDigits.slice(-len);
      if (recSuffix === winSuffix) return len === 1 ? 7 : 7 - len; // 2등~6등(끝5~끝2자리), 7등(끝1자리)
    }

    return null;
  }
}
