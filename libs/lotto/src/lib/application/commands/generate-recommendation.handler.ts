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

    const statisticalResults: { numbers: number[] }[] = [];
    const aiResults: { numbers: number[]; reasoning: string }[] = [];

    // 1. 통계 기반 추천 3게임 (메모리만)
    const statisticalNumbers = await this.generateStatisticalNumbers(3);
    for (let i = 0; i < statisticalNumbers.length; i++) {
      statisticalResults.push({ numbers: statisticalNumbers[i] });
      this.logger.log(
        `Statistical #${i + 1}: ${statisticalNumbers[i].join(', ')}`,
      );
    }

    // 2. AI 기반 추천 2게임 (Ollama 완료될 때까지 대기)
    const aiRecommendations = await this.generateAINumbers(2);
    for (let i = 0; i < aiRecommendations.length; i++) {
      aiResults.push(aiRecommendations[i]);
      this.logger.log(
        `AI #${i + 1}: ${aiRecommendations[i].numbers.join(', ')} (${aiRecommendations[i].reasoning})`,
      );
    }

    // 3. 통계+AI 모두 준비된 뒤 한 번에 DB 저장 (부분 저장 방지)
    const toSave: Recommendation[] = [];
    for (let i = 0; i < statisticalResults.length; i++) {
      toSave.push(
        this.recommendationRepository.create({
          targetDrawId,
          type: RecommendationType.STATISTICAL,
          gameNumber: i + 1,
          numbers: statisticalResults[i].numbers,
          aiReasoning: null,
        }),
      );
    }
    for (let i = 0; i < aiResults.length; i++) {
      toSave.push(
        this.recommendationRepository.create({
          targetDrawId,
          type: RecommendationType.AI,
          gameNumber: i + 4,
          numbers: aiResults[i].numbers,
          aiReasoning: aiResults[i].reasoning,
        }),
      );
    }
    const recommendations = await this.recommendationRepository.save(toSave);

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
