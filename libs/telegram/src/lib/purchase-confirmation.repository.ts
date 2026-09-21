import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LotteryType,
  PurchaseConfirmation,
  PurchaseStatus,
} from './purchase-confirmation.entity';

@Injectable()
export class PurchaseConfirmationRepository {
  constructor(
    @InjectRepository(PurchaseConfirmation)
    private readonly repository: Repository<PurchaseConfirmation>,
  ) {}

  async ensurePending(
    lotteryType: LotteryType,
    drawId: number,
    recommendationSummary: string,
    expectedAmount = 5000,
  ): Promise<PurchaseConfirmation> {
    const existing = await this.repository.findOneBy({ lotteryType, drawId });
    if (existing) return existing;
    try {
      return await this.repository.save(
        this.repository.create({
          lotteryType,
          drawId,
          status: PurchaseStatus.PENDING,
          expectedAmount,
          recommendationSummary,
        }),
      );
    } catch {
      return this.repository.findOneByOrFail({ lotteryType, drawId });
    }
  }

  findOne(
    lotteryType: LotteryType,
    drawId: number,
  ): Promise<PurchaseConfirmation | null> {
    return this.repository.findOneBy({ lotteryType, drawId });
  }

  async setMessageId(
    lotteryType: LotteryType,
    drawId: number,
    messageId: number,
  ): Promise<void> {
    await this.repository.update(
      { lotteryType, drawId },
      { telegramMessageId: String(messageId) },
    );
  }

  async setStatus(
    lotteryType: LotteryType,
    drawId: number,
    status: PurchaseStatus.CONFIRMED | PurchaseStatus.SKIPPED,
  ): Promise<PurchaseConfirmation | null> {
    const existing = await this.repository.findOneBy({ lotteryType, drawId });
    if (!existing) return null;
    if (existing.status === status) return existing;

    const now = new Date();
    await this.repository.update(
      { id: existing.id },
      {
        status,
        confirmedAt: status === PurchaseStatus.CONFIRMED ? now : null,
        skippedAt: status === PurchaseStatus.SKIPPED ? now : null,
      },
    );
    return this.repository.findOneByOrFail({ id: existing.id });
  }

  findPending(lotteryType: LotteryType): Promise<PurchaseConfirmation[]> {
    return this.repository.find({
      where: { lotteryType, status: PurchaseStatus.PENDING },
      order: { drawId: 'DESC' },
      take: 1,
    });
  }

  async markReminded(id: string): Promise<void> {
    await this.repository.increment({ id }, 'reminderCount', 1);
    await this.repository.update({ id }, { lastRemindedAt: new Date() });
  }
}
