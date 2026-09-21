import {
  TelegramService,
  LotteryType,
  PurchaseStatus,
} from '@lottochu/telegram';

describe('Telegram purchase callbacks', () => {
  function setup() {
    const config = {
      get: (key: string) =>
        ({
          TELEGRAM_BOT_TOKEN: 'test-token',
          TELEGRAM_CHAT_ID: '123',
          TELEGRAM_UPDATES_ENABLED: 'false',
        })[key],
    };
    const purchases = { setStatus: jest.fn().mockResolvedValue({}) };
    const service = new TelegramService(
      config as never,
      {} as never,
      purchases as never,
    );
    const bot = { action: jest.fn(), catch: jest.fn() };
    (service as unknown as { bot: unknown }).bot = bot;
    service.onModuleInit();
    const context = {
      chat: { id: 123 },
      from: { id: 123 },
      match: ['pc:l:1243:c', 'l', '1243', 'c'],
      answerCbQuery: jest.fn().mockResolvedValue(true),
      editMessageReplyMarkup: jest.fn().mockResolvedValue(true),
    };
    return { purchases, bot, context, handle: bot.action.mock.calls[0][1] };
  }

  it('saves an expired click and still clears its buttons', async () => {
    const { purchases, context, handle } = setup();
    context.answerCbQuery.mockRejectedValue({
      response: {
        error_code: 400,
        description:
          'Bad Request: query is too old and response timeout expired or query ID is invalid',
      },
    });
    await expect(handle(context)).resolves.toBeUndefined();
    expect(purchases.setStatus).toHaveBeenCalledWith(
      LotteryType.LOTTO,
      1243,
      PurchaseStatus.CONFIRMED,
    );
    expect(context.editMessageReplyMarkup).toHaveBeenCalledWith({
      inline_keyboard: [],
    });
  });

  it('keeps an update error from escaping and stopping polling', () => {
    const { bot } = setup();
    expect(() =>
      bot.catch.mock.calls[0][0](new Error('callback failed')),
    ).not.toThrow();
  });

  it('rejects clicks from another chat without changing purchases', async () => {
    const { purchases, context, handle } = setup();
    context.chat.id = 999;
    await handle(context);
    expect(purchases.setStatus).not.toHaveBeenCalled();
  });
});
