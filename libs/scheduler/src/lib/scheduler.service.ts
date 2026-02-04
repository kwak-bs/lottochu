import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import {
  SyncDrawsCommand,
  GenerateRecommendationCommand,
  CheckResultsCommand,
  DrawRepository,
} from '@lottochu/lotto';
import {
  TelegramService,
  RecommendationMessage,
  ResultMessage,
} from '@lottochu/telegram';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly drawRepository: DrawRepository,
    private readonly telegramService: TelegramService,
  ) { }

  /**
   * 매주 월요일 오후 12시 30분 - 이번 주 추천 번호 생성 및 발송
   * Cron: 30 12 * * 1 (월요일 12:30)
   */
  @Cron('30 12 * * 1', {
    name: 'weekly-recommendation',
    timeZone: 'Asia/Seoul',
  })
  async handleWeeklyRecommendation() {
    this.logger.log('🎰 Starting weekly recommendation generation...');

    try {
      // 최신 회차 + 1 = 이번 주 대상 회차
      const latestDraw = await this.drawRepository.findLatest();
      const targetDrawId = latestDraw ? latestDraw.id + 1 : 1;

      // 추천 번호 생성
      const command = new GenerateRecommendationCommand(targetDrawId);
      const result = await this.commandBus.execute(command);

      // 텔레그램 발송
      const nextSaturday = this.getNextSaturday();
      const message: RecommendationMessage = {
        targetDrawId,
        drawDate: nextSaturday.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }),
        statistical: result.statistical.map((s: { numbers: number[] }, i: number) => ({
          gameNumber: i + 1,
          numbers: s.numbers,
        })),
        ai: result.ai.map((a: { numbers: number[]; reasoning: string }, i: number) => ({
          gameNumber: i + 4,
          numbers: a.numbers,
          reasoning: a.reasoning,
        })),
      };

      const sent = await this.telegramService.sendRecommendation(message);
      if (sent) {
        this.logger.log(`✅ Weekly recommendation sent for draw #${targetDrawId}`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to generate weekly recommendation:', error);
    }
  }

  /**
   * 매주 토요일 오후 10시 - 당첨 결과 확인 및 발송
   * Cron: 0 22 * * 6 (토요일 22:00)
   */
  @Cron('0 22 * * 6', {
    name: 'weekly-result-check',
    timeZone: 'Asia/Seoul',
  })
  async handleWeeklyResultCheck() {
    this.logger.log('🎯 Starting weekly result check...');

    try {
      // 동행복권에서 최신 결과 동기화
      const syncCommand = new SyncDrawsCommand();
      await this.commandBus.execute(syncCommand);

      // 최신 회차 조회
      const latestDraw = await this.drawRepository.findLatest();
      if (!latestDraw) {
        this.logger.warn('No draws found');
        return;
      }

      // 결과 체크
      const checkCommand = new CheckResultsCommand(latestDraw.id);
      const checkResult = await this.commandBus.execute(checkCommand);

      if (!checkResult || checkResult.results.length === 0) {
        this.logger.warn(`No recommendations found for draw #${latestDraw.id}`);
        return;
      }

      // 텔레그램 발송
      const message: ResultMessage = {
        drawId: checkResult.drawId,
        winningNumbers: checkResult.winningNumbers,
        bonusNumber: checkResult.bonusNumber,
        results: checkResult.results.map((r: {
          gameNumber: number;
          type: string;
          numbers: number[];
          matchedCount: number;
          matchedNumbers: number[];
          hasBonus: boolean;
          prizeRank: number | null;
        }) => ({
          gameNumber: r.gameNumber,
          type: r.type,
          numbers: r.numbers,
          matchedCount: r.matchedCount,
          matchedNumbers: r.matchedNumbers,
          hasBonus: r.hasBonus,
          prizeRank: r.prizeRank,
        })),
      };

      const sent = await this.telegramService.sendResult(message);
      if (sent) {
        this.logger.log(`✅ Weekly result sent for draw #${latestDraw.id}`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to check weekly results:', error);
    }
  }

  /**
   * 매주 토요일 오후 10시 30분 - 통계 갱신
   * Cron: 30 22 * * 6 (토요일 22:30)
   */
  @Cron('30 22 * * 6', {
    name: 'statistics-update',
    timeZone: 'Asia/Seoul',
  })
  async handleStatisticsUpdate() {
    this.logger.log('📊 Updating statistics...');

    try {
      // 동행복권에서 최신 데이터 동기화
      const syncCommand = new SyncDrawsCommand();
      await this.commandBus.execute(syncCommand);

      this.logger.log('✅ Statistics updated');
    } catch (error) {
      this.logger.error('❌ Failed to update statistics:', error);
    }
  }

  /**
   * 다음 토요일 날짜 계산
   */
  private getNextSaturday(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + daysUntilSaturday);
    return nextSaturday;
  }
}
