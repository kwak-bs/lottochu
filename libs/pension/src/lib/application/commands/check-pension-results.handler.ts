import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CheckPensionResultsCommand } from './check-pension-results.command';
import {
  PensionDrawRepository,
  PensionRecommendationRepository,
  PensionResultRepository,
} from '../../infrastructure/repositories';
import { calculatePensionPrizeRank } from '../../domain/pension-prize-rank';

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
  prizeByRank: {
    1: string | null;
    2: string | null;
    3: string | null;
    4: string | null;
    5: string | null;
    6: string | null;
    7: string | null;
    8: string | null;
  };
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
    this.logger.log(`Checking pension results for draw #${command.drawId}...`);

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
      const existing =
        await this.pensionResultRepository.findByRecommendationId(rec.id);
      const prizeRank =
        existing?.prizeRank ??
        calculatePensionPrizeRank(
          rec.groupNo,
          rec.digits,
          draw.groupNo,
          draw.digits,
        );

      if (!existing) {
        await this.pensionResultRepository.save({
          recommendationId: rec.id,
          prizeRank,
        });
      }

      results.push({
        recommendationId: rec.id,
        gameNumber: rec.gameNumber,
        type: rec.type,
        groupNo: rec.groupNo,
        digits: rec.digits,
        prizeRank,
      });

      if (prizeRank != null && (bestRank == null || prizeRank < bestRank)) {
        bestRank = prizeRank;
      }
    }

    return {
      drawId: command.drawId,
      winningGroupNo: draw.groupNo,
      winningDigits: draw.digits,
      prizeByRank: {
        1: draw.prize1st,
        2: draw.prize2nd,
        3: draw.prize3rd,
        4: draw.prize4th,
        5: draw.prize5th,
        6: draw.prize6th,
        7: draw.prize7th,
        8: draw.prize8th,
      },
      results,
      totalRecommendations: recommendations.length,
      bestRank,
    };
  }
}
