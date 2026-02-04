import { Controller, Post, Get, Query, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  SyncDrawsCommand,
  SyncDrawsResult,
  GenerateRecommendationCommand,
  GenerateRecommendationResult,
} from '../application/commands';
import { DrawRepository } from '../infrastructure/repositories';

@Controller('lotto')
export class LottoController {
  private readonly logger = new Logger(LottoController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly drawRepository: DrawRepository,
  ) {}

  /**
   * 동행복권에서 당첨 번호 동기화
   * POST /lotto/sync?start=1&end=100
   */
  @Post('sync')
  async syncDraws(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ): Promise<SyncDrawsResult> {
    this.logger.log(`Sync request: start=${start}, end=${end}`);

    const command = new SyncDrawsCommand(
      start ? parseInt(start, 10) : undefined,
      end ? parseInt(end, 10) : undefined,
    );

    return this.commandBus.execute(command);
  }

  /**
   * 저장된 모든 당첨 번호 조회
   * GET /lotto/draws
   */
  @Get('draws')
  async getAllDraws() {
    const draws = await this.drawRepository.findAll();
    return {
      count: draws.length,
      draws,
    };
  }

  /**
   * 최신 당첨 번호 조회
   * GET /lotto/draws/latest
   */
  @Get('draws/latest')
  async getLatestDraw() {
    return this.drawRepository.findLatest();
  }

  /**
   * DB 상태 확인
   * GET /lotto/status
   */
  @Get('status')
  async getStatus() {
    const count = await this.drawRepository.count();
    const latest = await this.drawRepository.findLatest();

    return {
      totalDraws: count,
      latestDrawId: latest?.id ?? null,
      latestDrawDate: latest?.drawDate ?? null,
    };
  }

  /**
   * 로또 번호 추천 생성
   * POST /lotto/recommend?draw=1156
   */
  @Post('recommend')
  async generateRecommendation(
    @Query('draw') drawId?: string,
  ): Promise<GenerateRecommendationResult> {
    // draw가 없으면 최신 회차 + 1로 설정
    let targetDrawId: number;
    if (drawId) {
      targetDrawId = parseInt(drawId, 10);
    } else {
      const latest = await this.drawRepository.findLatest();
      targetDrawId = latest ? latest.id + 1 : 1;
    }

    this.logger.log(`Generating recommendation for draw #${targetDrawId}`);

    const command = new GenerateRecommendationCommand(targetDrawId);
    return this.commandBus.execute(command);
  }
}
