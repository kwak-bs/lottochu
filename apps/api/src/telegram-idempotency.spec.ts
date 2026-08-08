import { NotificationEventType, TelegramService } from '@lottochu/telegram';

describe('TelegramService delivery idempotency', () => {
  const recommendation = {
    targetDrawId: 300,
    drawDate: '2026년 8월 15일 토요일',
    statistical: [],
    ai: [],
  };

  function createService(claimed: boolean) {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return 'test-token';
        if (key === 'TELEGRAM_CHAT_ID') return 'test-chat';
        return undefined;
      }),
    };
    const deliveryRepository = {
      claim: jest.fn().mockResolvedValue(claimed),
      markSent: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    const sendMessage = jest.fn().mockResolvedValue({ message_id: 1 });
    const service = new TelegramService(
      configService as never,
      deliveryRepository as never,
    );
    (service as unknown as { bot: unknown }).bot = {
      telegram: { sendMessage },
    };

    return { service, deliveryRepository, sendMessage };
  }

  it('skips a delivery that has already been claimed or sent', async () => {
    const { service, deliveryRepository, sendMessage } = createService(false);

    await expect(service.sendRecommendation(recommendation)).resolves.toBe(
      true,
    );

    expect(deliveryRepository.claim).toHaveBeenCalledWith(
      NotificationEventType.LOTTO_RECOMMENDATION,
      300,
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('marks a claimed delivery as sent', async () => {
    const { service, deliveryRepository, sendMessage } = createService(true);

    await expect(service.sendRecommendation(recommendation)).resolves.toBe(
      true,
    );

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(deliveryRepository.markSent).toHaveBeenCalledWith(
      NotificationEventType.LOTTO_RECOMMENDATION,
      300,
    );
  });

  it('sends a celebratory lotto summary with the expected total prize', async () => {
    const { service, sendMessage } = createService(true);

    await service.sendResult({
      drawId: 301,
      winningNumbers: [1, 2, 3, 4, 5, 6],
      bonusNumber: 7,
      prizeByRank: {
        1: '1000000000',
        2: '50000000',
        3: '1500000',
        4: '50000',
        5: '5000',
      },
      results: [
        {
          gameNumber: 1,
          type: 'STATISTICAL',
          numbers: [1, 2, 3, 10, 11, 12],
          matchedCount: 3,
          matchedNumbers: [1, 2, 3],
          hasBonus: false,
          prizeRank: 5,
        },
      ],
    });

    const calls = sendMessage.mock.calls as unknown as [string, string][];
    const message = calls[0][1];
    expect(message).toContain('당첨을 축하합니다');
    expect(message).toContain('예상 총 당첨금: <b>5,000원</b>');
    expect(message).toContain('공식 당첨 결과');
  });

  it('announces a pension bonus prize and its recurring payout', async () => {
    const { service, sendMessage } = createService(true);

    await service.sendPensionResult({
      drawId: 302,
      winningGroupNo: 3,
      winningDigits: '221540',
      winningBonusDigits: '123456',
      prizeByRank: {
        1: null,
        2: null,
        3: null,
        4: null,
        5: null,
        6: null,
        7: null,
        8: null,
      },
      results: [
        {
          gameNumber: 1,
          type: 'STATISTICAL',
          groupNo: 1,
          digits: '123456',
          prizeRank: 8,
        },
      ],
    });

    const calls = sendMessage.mock.calls as unknown as [string, string][];
    const message = calls[0][1];
    expect(message).toContain('고액 당첨');
    expect(message).toContain('보너스번호: <b>123456</b>');
    expect(message).toContain('월 100만원 × 10년');
    expect(message).toContain('공식 당첨 결과');
  });
});
