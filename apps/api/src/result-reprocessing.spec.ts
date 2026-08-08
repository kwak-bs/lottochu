import { CheckResultsHandler } from '@lottochu/lotto';
import { CheckPensionResultsHandler } from '@lottochu/pension';

describe('result reprocessing', () => {
  it('returns an existing lotto result so Telegram delivery can be retried', async () => {
    const drawRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 10,
        numbers: [1, 2, 3, 4, 5, 6],
        bonusNumber: 7,
        prize1st: '100',
        prize2nd: '90',
        prize3rd: '80',
      }),
    };
    const recommendationRepository = {
      findByDrawId: jest.fn().mockResolvedValue([
        {
          id: 'rec-1',
          gameNumber: 1,
          type: 'STATISTICAL',
          numbers: [1, 2, 3, 10, 11, 12],
        },
      ]),
    };
    const resultRepository = {
      findByRecommendationId: jest.fn().mockResolvedValue({
        matchedCount: 3,
        matchedNumbers: [1, 2, 3],
        hasBonus: false,
        prizeRank: 5,
      }),
      save: jest.fn(),
    };
    const handler = new CheckResultsHandler(
      drawRepository as never,
      recommendationRepository as never,
      resultRepository as never,
    );

    const result = await handler.execute({ drawId: 10 });

    expect(result?.results).toHaveLength(1);
    expect(result?.results[0].prizeRank).toBe(5);
    expect(resultRepository.save).not.toHaveBeenCalled();
  });

  it('returns an existing pension result so Telegram delivery can be retried', async () => {
    const drawRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 20,
        groupNo: 3,
        digits: '221540',
        bonusDigits: '123456',
        prize1st: '1',
        prize2nd: '2',
        prize3rd: '3',
        prize4th: '4',
        prize5th: '5',
        prize6th: '6',
        prize7th: '7',
        prize8th: '8',
      }),
    };
    const recommendationRepository = {
      findByDrawId: jest.fn().mockResolvedValue([
        {
          id: 'rec-2',
          gameNumber: 1,
          type: 'STATISTICAL',
          groupNo: 1,
          digits: '221540',
        },
      ]),
    };
    const resultRepository = {
      findByRecommendationId: jest.fn().mockResolvedValue({ prizeRank: 2 }),
      save: jest.fn(),
      updatePrizeRank: jest.fn(),
    };
    const handler = new CheckPensionResultsHandler(
      drawRepository as never,
      recommendationRepository as never,
      resultRepository as never,
    );

    const result = await handler.execute({ drawId: 20 });

    expect(result?.results).toHaveLength(1);
    expect(result?.results[0].prizeRank).toBe(2);
    expect(resultRepository.save).not.toHaveBeenCalled();
    expect(resultRepository.updatePrizeRank).not.toHaveBeenCalled();
  });

  it('updates a pension result when newly synced bonus digits change its rank', async () => {
    const drawRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 21,
        groupNo: 3,
        digits: '221540',
        bonusDigits: '123456',
        prize1st: '1',
        prize2nd: '2',
        prize3rd: '3',
        prize4th: '4',
        prize5th: '5',
        prize6th: '6',
        prize7th: '7',
        prize8th: '8',
      }),
    };
    const recommendationRepository = {
      findByDrawId: jest.fn().mockResolvedValue([
        {
          id: 'rec-bonus',
          gameNumber: 1,
          type: 'STATISTICAL',
          groupNo: 1,
          digits: '123456',
        },
      ]),
    };
    const resultRepository = {
      findByRecommendationId: jest.fn().mockResolvedValue({ prizeRank: null }),
      save: jest.fn(),
      updatePrizeRank: jest.fn(),
    };
    const handler = new CheckPensionResultsHandler(
      drawRepository as never,
      recommendationRepository as never,
      resultRepository as never,
    );

    const result = await handler.execute({ drawId: 21 });

    expect(result?.results[0].prizeRank).toBe(8);
    expect(resultRepository.updatePrizeRank).toHaveBeenCalledWith(
      'rec-bonus',
      8,
    );
  });
});
