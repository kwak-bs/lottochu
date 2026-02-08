import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SyncDrawsCommand } from './sync-draws.command';
import { DrawRepository } from '../../infrastructure/repositories';
import { DhLotteryClient, LottoDrawInfo } from '@lottochu/shared';
import { Draw } from '../../domain/entities';

/**
 * SyncDraws Command 결과
 */
export interface SyncDrawsResult {
  syncedCount: number;
  startDrawId: number;
  endDrawId: number;
  newDraws: number[];
}

@CommandHandler(SyncDrawsCommand)
export class SyncDrawsHandler implements ICommandHandler<SyncDrawsCommand> {
  private readonly logger = new Logger(SyncDrawsHandler.name);

  constructor(
    private readonly drawRepository: DrawRepository,
    private readonly dhLotteryClient: DhLotteryClient,
  ) {}

  async execute(command: SyncDrawsCommand): Promise<SyncDrawsResult> {
    this.logger.log('Starting draw synchronization...');

    // 시작 회차 결정
    let startId = command.startDrawId;
    if (!startId) {
      const latestDraw = await this.drawRepository.findLatest();
      startId = latestDraw ? latestDraw.id + 1 : 1;
    }

    // 끝 회차 결정
    let endId = command.endDrawId;
    if (!endId) {
      endId = await this.dhLotteryClient.getLatestDrawId();
    }

    this.logger.log(`Syncing draws from #${startId} to #${endId}`);

    // 새 API는 한 번에 모든 데이터를 가져오므로 범위 조회 사용
    const drawsFromApi = await this.dhLotteryClient.getDrawRange(startId, endId);
    this.logger.log(`Fetched ${drawsFromApi.length} draws from API`);

    const newDraws: number[] = [];
    let syncedCount = 0;

    for (const drawInfo of drawsFromApi) {
      // 이미 존재하는지 확인
      const exists = await this.drawRepository.exists(drawInfo.drawId);
      if (exists) {
        this.logger.debug(`Draw #${drawInfo.drawId} already exists, skipping`);
        continue;
      }

      // 저장
      const draw = this.mapToDraw(drawInfo);
      await this.drawRepository.save(draw);

      newDraws.push(drawInfo.drawId);
      syncedCount++;

      this.logger.log(
        `Synced draw #${drawInfo.drawId}: ${drawInfo.numbers.join(', ')} + ${drawInfo.bonusNumber}`,
      );
    }

    this.logger.log(
      `Synchronization complete. Synced ${syncedCount} new draws.`,
    );

    return {
      syncedCount,
      startDrawId: startId,
      endDrawId: endId,
      newDraws,
    };
  }

  private mapToDraw(info: LottoDrawInfo): Partial<Draw> {
    return {
      id: info.drawId,
      drawDate: info.drawDate,
      numbers: info.numbers,
      bonusNumber: info.bonusNumber,
      prize1st: info.prize1st?.toString() ?? null,
      winners1st: info.winners1st ?? null,
      prize2nd: info.prize2nd?.toString() ?? null,
      winners2nd: info.winners2nd ?? null,
      prize3rd: info.prize3rd?.toString() ?? null,
      winners3rd: info.winners3rd ?? null,
    };
  }
}
