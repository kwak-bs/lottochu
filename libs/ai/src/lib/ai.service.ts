import { Injectable, Logger } from '@nestjs/common';
import { OllamaClient, AiRecommendationResult } from './ollama.client';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly ollamaClient: OllamaClient) {}

  /**
   * AI 기반 로또 번호 추천
   * @param recentDraws 최근 당첨 번호 데이터 (외부에서 전달)
   * @param count 추천 세트 수 (기본 2)
   */
  async generateRecommendations(
    recentDraws: { numbers: number[]; bonusNumber: number }[],
    count: number = 2,
  ): Promise<AiRecommendationResult[]> {
    this.logger.log(`Generating ${count} AI recommendations`);

    if (recentDraws.length === 0) {
      this.logger.warn('No draws provided, generating random numbers');
      return this.generateRandomNumbers(count);
    }

    // Ollama에서 추천 받기
    const recommendations = await this.ollamaClient.generateLottoRecommendation(
      recentDraws,
      count,
    );

    return recommendations;
  }

  /**
   * Ollama 서버 상태 확인
   */
  async checkOllamaStatus(): Promise<{ available: boolean; message: string }> {
    const available = await this.ollamaClient.isAvailable();
    return {
      available,
      message: available
        ? 'Ollama server is running'
        : 'Ollama server is not available',
    };
  }

  /**
   * 랜덤 번호 생성 (fallback)
   */
  private generateRandomNumbers(count: number): AiRecommendationResult[] {
    return Array.from({ length: count }, () => {
      const numbers: number[] = [];
      while (numbers.length < 6) {
        const num = Math.floor(Math.random() * 45) + 1;
        if (!numbers.includes(num)) {
          numbers.push(num);
        }
      }
      return {
        numbers: numbers.sort((a, b) => a - b),
        reasoning: '데이터 부족으로 랜덤 생성',
      };
    });
  }
}
