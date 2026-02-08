import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Ollama API 응답
 */
interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * AI 추천 결과
 */
export interface AiRecommendationResult {
  numbers: number[];
  reasoning: string;
}

@Injectable()
export class OllamaClient {
  private readonly logger = new Logger(OllamaClient.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get('OLLAMA_BASE_URL') || 'http://localhost:11434';
    this.model = this.configService.get('OLLAMA_MODEL') || 'llama3.2:8b';
  }

  /**
   * Ollama 서버 상태 확인
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/tags`),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.warn('Ollama server is not available');
      return false;
    }
  }

  /**
   * 로또 번호 추천 받기
   */
  async generateLottoRecommendation(
    recentDraws: { numbers: number[]; bonusNumber: number }[],
    count: number = 2,
  ): Promise<AiRecommendationResult[]> {
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      this.logger.warn('Ollama not available, returning random numbers');
      return this.generateFallbackNumbers(count);
    }

    const prompt = this.buildPrompt(recentDraws, count);
    
    try {
      const response = await this.callOllama(prompt);
      const parsed = this.parseResponse(response, count);
      return parsed;
    } catch (error) {
      this.logger.error('Failed to get AI recommendation:', error);
      return this.generateFallbackNumbers(count);
    }
  }

  /**
   * Ollama API 호출
   */
  private async callOllama(prompt: string): Promise<string> {
    this.logger.debug(`Calling Ollama with model: ${this.model}`);

    const response = await firstValueFrom(
      this.httpService.post<OllamaResponse>(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt,
          stream: false,
        },
        {
          timeout: 60000, // 60초 타임아웃
        },
      ),
    );

    return response.data.response;
  }

  /**
   * 프롬프트 생성
   */
  private buildPrompt(
    recentDraws: { numbers: number[]; bonusNumber: number }[],
    count: number,
  ): string {
    const drawsText = recentDraws
      .map(
        (d, i) =>
          `${i + 1}. ${d.numbers.join(', ')} + 보너스: ${d.bonusNumber}`,
      )
      .join('\n');

    return `당신은 로또 번호 분석 전문가입니다.

[최근 당첨 번호]
${drawsText}

위 데이터를 분석하여 다음 회차에 나올 것 같은 로또 번호 6개를 ${count}세트 추천해주세요.

각 세트는 1~45 사이의 서로 다른 숫자 6개로 구성되어야 합니다.
각 세트마다 왜 그 번호를 선택했는지 간단히 설명해주세요.

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "recommendations": [
    {
      "numbers": [1, 2, 3, 4, 5, 6],
      "reasoning": "선택 이유"
    }
  ]
}`;
  }

  /**
   * AI 응답 파싱
   */
  private parseResponse(
    response: string,
    expectedCount: number,
  ): AiRecommendationResult[] {
    try {
      // JSON 부분만 추출
      const jsonMatch = response.match(/\{[\s\S]*"recommendations"[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const recommendations = parsed.recommendations || [];

      // 유효성 검사 및 정제
      const validResults: AiRecommendationResult[] = [];
      for (const rec of recommendations.slice(0, expectedCount)) {
        if (this.isValidRecommendation(rec)) {
          validResults.push({
            numbers: rec.numbers.sort((a: number, b: number) => a - b),
            reasoning: rec.reasoning || 'AI 추천',
          });
        }
      }

      // 부족한 경우 랜덤으로 채우기
      while (validResults.length < expectedCount) {
        validResults.push(this.generateSingleFallback());
      }

      return validResults;
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error);
      return this.generateFallbackNumbers(expectedCount);
    }
  }

  /**
   * 추천 유효성 검사
   */
  private isValidRecommendation(rec: any): boolean {
    if (!rec.numbers || !Array.isArray(rec.numbers)) return false;
    if (rec.numbers.length !== 6) return false;

    const uniqueNumbers = new Set(rec.numbers);
    if (uniqueNumbers.size !== 6) return false;

    for (const num of rec.numbers) {
      if (typeof num !== 'number' || num < 1 || num > 45) return false;
    }

    return true;
  }

  /**
   * Fallback: 랜덤 번호 생성
   */
  private generateFallbackNumbers(count: number): AiRecommendationResult[] {
    return Array.from({ length: count }, () => this.generateSingleFallback());
  }

  private generateSingleFallback(): AiRecommendationResult {
    const numbers: number[] = [];
    while (numbers.length < 6) {
      const num = Math.floor(Math.random() * 45) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return {
      numbers: numbers.sort((a, b) => a - b),
      reasoning: 'AI 서버 연결 불가로 랜덤 생성',
    };
  }
}
