import {
  GenerateRecommendationHandler,
  RecommendationType,
} from '@lottochu/lotto';
import {
  GeneratePensionRecommendationHandler,
  PensionRecommendationType,
} from '@lottochu/pension';

describe('recommendation generation idempotency', () => {
  it('reuses a complete existing lotto recommendation set', async () => {
    const existing = Array.from({ length: 5 }, (_, index) => ({
      id: `lotto-${index + 1}`,
      targetDrawId: 100,
      type: index < 3 ? RecommendationType.STATISTICAL : RecommendationType.AI,
      gameNumber: index + 1,
      numbers: [1, 2, 3, 4, 5, index + 6],
      aiReasoning: index < 3 ? null : 'existing AI recommendation',
    }));
    const typeOrmRepository = { save: jest.fn() };
    const storedRepository = {
      findByDrawId: jest.fn().mockResolvedValue(existing),
    };
    const statisticsService = { getCandidateNumbers: jest.fn() };
    const aiService = { generateRecommendations: jest.fn() };
    const drawRepository = { findAll: jest.fn() };
    const handler = new GenerateRecommendationHandler(
      typeOrmRepository as never,
      storedRepository as never,
      statisticsService as never,
      aiService as never,
      drawRepository as never,
    );

    const result = await handler.execute({ targetDrawId: 100 });

    expect(result.recommendations).toHaveLength(5);
    expect(result.statistical).toHaveLength(3);
    expect(result.ai).toHaveLength(2);
    expect(typeOrmRepository.save).not.toHaveBeenCalled();
    expect(statisticsService.getCandidateNumbers).not.toHaveBeenCalled();
  });

  it('rejects an incomplete existing pension recommendation set', async () => {
    const existing = Array.from({ length: 3 }, (_, index) => ({
      id: `pension-${index + 1}`,
      targetDrawId: 200,
      type: PensionRecommendationType.STATISTICAL,
      gameNumber: index + 1,
      groupNo: index + 1,
      digits: '123456',
      aiReasoning: null,
    }));
    const typeOrmRepository = { create: jest.fn() };
    const storedRepository = {
      findByDrawId: jest.fn().mockResolvedValue(existing),
      saveMany: jest.fn(),
    };
    const statisticsService = {
      getRecommendedPensionDigitsRanked: jest.fn(),
    };
    const handler = new GeneratePensionRecommendationHandler(
      typeOrmRepository as never,
      storedRepository as never,
      statisticsService as never,
    );

    await expect(handler.execute({ targetDrawId: 200 })).rejects.toThrow(
      'incomplete recommendation set',
    );
    expect(storedRepository.saveMany).not.toHaveBeenCalled();
  });
});
