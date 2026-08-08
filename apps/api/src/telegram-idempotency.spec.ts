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
});
