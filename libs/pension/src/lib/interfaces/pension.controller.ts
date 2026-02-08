import {
  Controller,
  Post,
  Get,
  Query,
  Logger,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  SyncPensionDrawsCommand,
  SyncPensionDrawsResult,
  GeneratePensionRecommendationCommand,
  GeneratePensionRecommendationResult,
} from '../application/commands';
import { buildPensionRecommendationMessage } from '../application/pension-recommendation-message.builder';
import { PensionDrawRepository } from '../infrastructure/repositories';
import { TelegramService } from '@lottochu/telegram';
import { getNextThursday } from '@lottochu/shared';

@Controller('pension')
export class PensionController {
  private readonly logger = new Logger(PensionController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly pensionDrawRepository: PensionDrawRepository,
    private readonly telegramService: TelegramService,
  ) { }

  /**
   * 연금복권 당첨 데이터 동기화
   * - start, end 미지정: DB 최신 회차+1 ~ API 최신 회차
   * - start=1: 역대 전부 동기화 (1회차부터 최신까지, 이미 있는 회차는 스킵)
   * - end 미지정 시 API에서 조회한 최신 회차까지
   */
  @Post('sync')
  async syncDraws(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ): Promise<SyncPensionDrawsResult> {
    this.logger.log(`Pension sync: start=${start}, end=${end}`);

    const command = new SyncPensionDrawsCommand(
      start ? parseInt(start, 10) : undefined,
      end ? parseInt(end, 10) : undefined,
    );

    return this.commandBus.execute(command);
  }

  @Get('draws')
  async getAllDraws() {
    const draws = await this.pensionDrawRepository.findAll();
    return { count: draws.length, draws };
  }

  @Get('draws/latest')
  async getLatestDraw() {
    return this.pensionDrawRepository.findLatest();
  }

  @Get('status')
  async getStatus() {
    const count = await this.pensionDrawRepository.count();
    const latest = await this.pensionDrawRepository.findLatest();

    return {
      totalDraws: count,
      latestDrawId: latest?.id ?? null,
      latestDrawDate: latest?.drawDate ?? null,
    };
  }

  @Post('recommend')
  async generateRecommendation(
    @Query('draw') drawId?: string,
  ): Promise<GeneratePensionRecommendationResult> {
    let targetDrawId: number;
    if (drawId) {
      targetDrawId = parseInt(drawId, 10);
    } else {
      const latest = await this.pensionDrawRepository.findLatest();
      targetDrawId = latest ? latest.id + 1 : 1;
    }

    this.logger.log(`Generating pension recommendation for draw #${targetDrawId}`);

    const command = new GeneratePensionRecommendationCommand(targetDrawId);
    return this.commandBus.execute(command);
  }

  /**
   * 추천 생성 후 텔레그램 전송 (수동 트리거)
   */
  @Post('recommend/send')
  async generateAndSendRecommendation(
    @Query('draw') drawId?: string,
  ): Promise<{ ok: boolean; targetDrawId: number; sent: boolean }> {
    const latest = await this.pensionDrawRepository.findLatest();
    const targetDrawId = drawId
      ? parseInt(drawId, 10)
      : latest
        ? latest.id + 1
        : 1;

    this.logger.log(`Generating and sending pension recommendation for draw #${targetDrawId}`);

    const command = new GeneratePensionRecommendationCommand(targetDrawId);
    const result = await this.commandBus.execute(command);

    const nextThursday = getNextThursday();
    const drawDateStr = nextThursday.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    const message = buildPensionRecommendationMessage(
      targetDrawId,
      result,
      drawDateStr,
    );

    const sent = await this.telegramService.sendPensionRecommendation(message);
    if (sent) {
      this.logger.log(`Pension recommendation sent to Telegram for draw #${targetDrawId}`);
    }
    return { ok: true, targetDrawId, sent: !!sent };
  }
}
