import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerateRecommendationCommand } from './generate-recommendation.command';
import { Recommendation, RecommendationType } from '../../domain/entities';
import { StatisticsService } from '@lottochu/statistics';
import { AiService } from '@lottochu/ai';
import { DrawRepository } from '../../infrastructure/repositories';

/**
 * 추천 결과
 */
export interface GenerateRecommendationResult {
  targetDrawId: number;
  recommendations: Recommendation[];
  statistical: { numbers: number[] }[];
  ai: { numbers: number[]; reasoning: string }[];
}

@CommandHandler(GenerateRecommendationCommand)
export class GenerateRecommendationHandler
  implements ICommandHandler<GenerateRecommendationCommand>
{
  private readonly logger = new Logger(GenerateRecommendationHandler.name);

  constructor(
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    private readonly statisticsService: StatisticsService,
    private readonly aiService: AiService,
    private readonly drawRepository: DrawRepository,
  ) {}

  async execute(
    command: GenerateRecommendationCommand,
  ): Promise<GenerateRecommendationResult> {
    const { targetDrawId } = command;
    this.logger.log(`Generating recommendations for draw #${targetDrawId}`);

    const recommendations: Recommendation[] = [];
    const statisticalResults: { numbers: number[] }[] = [];
    const aiResults: { numbers: number[]; reasoning: string }[] = [];

    // 1. 통계 기반 추천 3게임
    const statisticalNumbers = await this.generateStatisticalNumbers(3);
    for (let i = 0; i < statisticalNumbers.length; i++) {
      const rec = this.recommendationRepository.create({
        targetDrawId,
        type: RecommendationType.STATISTICAL,
        gameNumber: i + 1,
        numbers: statisticalNumbers[i],
        aiReasoning: null,
      });
      recommendations.push(await this.recommendationRepository.save(rec));
      statisticalResults.push({ numbers: statisticalNumbers[i] });
      this.logger.log(
        `Statistical #${i + 1}: ${statisticalNumbers[i].join(', ')}`,
      );
    }

    // 2. AI 기반 추천 2게임
    const aiRecommendations = await this.generateAINumbers(2);
    for (let i = 0; i < aiRecommendations.length; i++) {
      const aiRec = aiRecommendations[i];
      const rec = this.recommendationRepository.create({
        targetDrawId,
        type: RecommendationType.AI,
        gameNumber: i + 4, // 4, 5번 게임
        numbers: aiRec.numbers,
        aiReasoning: aiRec.reasoning,
      });
      recommendations.push(await this.recommendationRepository.save(rec));
      aiResults.push(aiRec);
      this.logger.log(
        `AI #${i + 1}: ${aiRec.numbers.join(', ')} (${aiRec.reasoning})`,
      );
    }

    this.logger.log(
      `Generated ${recommendations.length} recommendations for draw #${targetDrawId}`,
    );

    return {
      targetDrawId,
      recommendations,
      statistical: statisticalResults,
      ai: aiResults,
    };
  }

  /**
   * 통계 기반 추천 번호 생성
   * - 하위 20개 번호 제외
   * - 나머지 25개 중 랜덤 6개 선택
   */
  private async generateStatisticalNumbers(count: number): Promise<number[][]> {
    // 후보 번호 가져오기 (하위 20개 제외)
    const candidates = await this.statisticsService.getCandidateNumbers(20);

    const results: number[][] = [];
    for (let i = 0; i < count; i++) {
      const numbers = this.pickRandomNumbers(candidates, 6);
      results.push(numbers);
    }

    return results;
  }

  /**
   * AI 기반 추천 번호 생성 (Ollama 사용)
   */
  private async generateAINumbers(
    count: number,
  ): Promise<{ numbers: number[]; reasoning: string }[]> {
    // 최근 10회차 데이터 가져오기
    const allDraws = await this.drawRepository.findAll();
    const recentDraws = allDraws.slice(-10).map((d) => ({
      numbers: d.numbers,
      bonusNumber: d.bonusNumber,
    }));

    // AI 서비스에서 추천 받기
    return this.aiService.generateRecommendations(recentDraws, count);
  }

  /**
   * 배열에서 랜덤하게 N개 선택
   */
  private pickRandomNumbers(candidates: number[], count: number): number[] {
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).sort((a, b) => a - b);
  }
}
