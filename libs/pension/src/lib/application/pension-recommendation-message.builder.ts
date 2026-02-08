import type { PensionRecommendationMessage } from '@lottochu/telegram';
import type { GeneratePensionRecommendationResult } from './commands/generate-pension-recommendation.handler';

/**
 * 연금 추천 Command 결과를 텔레그램 전송용 메시지 DTO로 변환
 */
export function buildPensionRecommendationMessage(
  targetDrawId: number,
  result: GeneratePensionRecommendationResult,
  drawDate: string,
): PensionRecommendationMessage {
  return {
    targetDrawId,
    drawDate,
    statistical: result.statistical.map((s, i) => ({
      gameNumber: i + 1,
      groupNo: s.groupNo,
      digits: s.digits,
    })),
    ai: result.ai.map((a, i) => ({
      gameNumber: i + result.statistical.length + 1,
      groupNo: a.groupNo,
      digits: a.digits,
      reasoning: a.reasoning,
    })),
  };
}
