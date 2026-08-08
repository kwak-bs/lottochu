import {
  LotteryType,
  PurchaseConfirmationRepository,
  PurchaseStatus,
} from '@lottochu/telegram';

describe('PurchaseConfirmationRepository', () => {
  it('keeps an existing confirmation instead of resetting it to pending', async () => {
    const confirmed = {
      id: 'purchase-1',
      lotteryType: LotteryType.LOTTO,
      drawId: 1236,
      status: PurchaseStatus.CONFIRMED,
    };
    const ormRepository = {
      findOneBy: jest.fn().mockResolvedValue(confirmed),
      create: jest.fn(),
      save: jest.fn(),
    };
    const repository = new PurchaseConfirmationRepository(
      ormRepository as never,
    );

    await expect(
      repository.ensurePending(LotteryType.LOTTO, 1236, '1 2 3 4 5 6'),
    ).resolves.toBe(confirmed);
    expect(ormRepository.save).not.toHaveBeenCalled();
  });

  it('records confirmation idempotently', async () => {
    const pending = {
      id: 'purchase-2',
      lotteryType: LotteryType.PENSION,
      drawId: 329,
      status: PurchaseStatus.PENDING,
    };
    const confirmed = { ...pending, status: PurchaseStatus.CONFIRMED };
    const ormRepository = {
      findOneBy: jest.fn().mockResolvedValue(pending),
      findOneByOrFail: jest.fn().mockResolvedValue(confirmed),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const repository = new PurchaseConfirmationRepository(
      ormRepository as never,
    );

    await expect(
      repository.setStatus(LotteryType.PENSION, 329, PurchaseStatus.CONFIRMED),
    ).resolves.toEqual(confirmed);
    expect(ormRepository.update).toHaveBeenCalledTimes(1);
  });
});
