import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SyncPensionDrawsCommand } from './sync-pension-draws.command';
import { PensionDrawRepository } from '../../infrastructure/repositories';
import {
  DhPensionClient,
  PensionDrawInfo,
} from '@lottochu/shared';
import { PensionDraw } from '../../domain/entities';

export interface SyncPensionDrawsResult {
  syncedCount: number;
  startDrawId: number;
  endDrawId: number;
  newDraws: number[];
}

@CommandHandler(SyncPensionDrawsCommand)
export class SyncPensionDrawsHandler
  implements ICommandHandler<SyncPensionDrawsCommand>
{
  private readonly logger = new Logger(SyncPensionDrawsHandler.name);

  constructor(
    private readonly pensionDrawRepository: PensionDrawRepository,
    private readonly dhPensionClient: DhPensionClient,
  ) {}

  async execute(
    command: SyncPensionDrawsCommand,
  ): Promise<SyncPensionDrawsResult> {
    this.logger.log('Starting pension draw synchronization...');

    let startId = command.startDrawId;
    if (startId == null) {
      const latest = await this.pensionDrawRepository.findLatest();
      startId = latest ? latest.id + 1 : 1;
    }

    let endId = command.endDrawId;
    if (endId == null) {
      endId = await this.dhPensionClient.getLatestDrawId();
    }

    this.logger.log(`Syncing pension draws from #${startId} to #${endId}`);

    const drawsFromApi = await this.dhPensionClient.getDrawRange(startId, endId);
    const newDraws: number[] = [];
    let syncedCount = 0;

    for (const info of drawsFromApi) {
      const exists = await this.pensionDrawRepository.exists(info.drawId);
      if (exists) continue;

      const draw = this.mapToDraw(info);
      await this.pensionDrawRepository.save(draw);
      newDraws.push(info.drawId);
      syncedCount++;
    }

    this.logger.log(
      `Pension sync complete. Synced ${syncedCount} new draws.`,
    );

    return {
      syncedCount,
      startDrawId: startId,
      endDrawId: endId,
      newDraws,
    };
  }

  private mapToDraw(info: PensionDrawInfo): Partial<PensionDraw> {
    return {
      id: info.drawId,
      drawDate: info.drawDate,
      groupNo: info.groupNo,
      digits: info.digits,
      prize1st: info.prizes[0]?.toString() ?? null,
      prize2nd: info.prizes[1]?.toString() ?? null,
      prize3rd: info.prizes[2]?.toString() ?? null,
      prize4th: info.prizes[3]?.toString() ?? null,
      prize5th: info.prizes[4]?.toString() ?? null,
      prize6th: info.prizes[5]?.toString() ?? null,
      prize7th: info.prizes[6]?.toString() ?? null,
      prize8th: info.prizes[7]?.toString() ?? null,
      winners1st: info.winners[0] ?? null,
      winners2nd: info.winners[1] ?? null,
      winners3rd: info.winners[2] ?? null,
      winners4th: info.winners[3] ?? null,
      winners5th: info.winners[4] ?? null,
      winners6th: info.winners[5] ?? null,
      winners7th: info.winners[6] ?? null,
      winners8th: info.winners[7] ?? null,
    };
  }
}
