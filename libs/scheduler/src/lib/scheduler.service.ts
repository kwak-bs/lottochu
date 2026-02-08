import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import {
  SyncDrawsCommand,
  GenerateRecommendationCommand,
  CheckResultsCommand,
  DrawRepository,
  RecommendationRepository,
} from '@lottochu/lotto';
import {
  SyncPensionDrawsCommand,
  GeneratePensionRecommendationCommand,
  CheckPensionResultsCommand,
  PensionDrawRepository,
  PensionRecommendationRepository,
  buildPensionRecommendationMessage,
} from '@lottochu/pension';
import {
  TelegramService,
  RecommendationMessage,
  ResultMessage,
  PensionResultMessage,
} from '@lottochu/telegram';
import { getNextSaturday, getNextThursday } from '@lottochu/shared';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly drawRepository: DrawRepository,
    private readonly recommendationRepository: RecommendationRepository,
    private readonly pensionDrawRepository: PensionDrawRepository,
    private readonly pensionRecommendationRepository: PensionRecommendationRepository,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * 매주 월요일 오후 12시 30분 - 로또 추천 번호 생성 및 발송
   * 이미 해당 회차 추천 데이터가 있으면 스킵
   */
  @Cron('30 12 * * 1', {
    name: 'weekly-lotto-recommendation',
    timeZone: 'Asia/Seoul',
  })
  async handleWeeklyLottoRecommendation() {
    this.logger.log('🎰 Starting weekly recommendation generation...');

    try {
      // 최신 회차 + 1 = 이번 주 대상 회차
      const latestDraw = await this.drawRepository.findLatest();
      const targetDrawId = latestDraw ? latestDraw.id + 1 : 1;

      // 이미 수동으로 넣어둔 데이터가 있으면 스킵
      const existing = await this.recommendationRepository.findByDrawId(targetDrawId);
      if (existing.length > 0) {
        this.logger.log(
          `⏭️ Draw #${targetDrawId} already has ${existing.length} recommendations, skipping`,
        );
        return;
      }

      // 추천 번호 생성
      const command = new GenerateRecommendationCommand(targetDrawId);
      const result = await this.commandBus.execute(command);

      // 텔레그램 발송
      const nextSaturday = getNextSaturday();
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
      this.logger.error('❌ Failed to generate weekly lotto recommendation:', error);
    }
  }

  /**
   * 매주 금요일 오후 12시 30분 - 연금복권 추천 번호 생성 및 발송
   * 이미 해당 회차 추천 데이터가 있으면 스킵
   */
  @Cron('30 12 * * 5', {
    name: 'weekly-pension-recommendation',
    timeZone: 'Asia/Seoul',
  })
  async handleWeeklyPensionRecommendation() {
    this.logger.log('🎱 Starting weekly pension recommendation generation...');

    try {
      const latest = await this.pensionDrawRepository.findLatest();
      const targetDrawId = latest ? latest.id + 1 : 1;

      // 이미 수동으로 넣어둔 데이터가 있으면 스킵
      const existing = await this.pensionRecommendationRepository.findByDrawId(targetDrawId);
      if (existing.length > 0) {
        this.logger.log(
          `⏭️ Pension draw #${targetDrawId} already has ${existing.length} recommendations, skipping`,
        );
        return;
      }

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
        this.logger.log(`✅ Pension recommendation sent for draw #${targetDrawId}`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to generate weekly pension recommendation:', error);
    }
  }

  /**
   * 매주 토요일 오후 10시 - 로또 당첨 결과 확인 및 발송
   * Cron: 0 22 * * 6 (토요일 22:00)
   */
  @Cron('0 22 * * 6', {
    name: 'weekly-lotto-result-check',
    timeZone: 'Asia/Seoul',
  })
  async handleWeeklyLottoResultCheck() {
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
   * 매주 금요일 오후 12시 - 연금복권 당첨 결과 확인 및 발송
   * Cron: 0 12 * * 5 (금요일 12:00)
   */
  @Cron('0 12 * * 5', {
    name: 'weekly-pension-result-check',
    timeZone: 'Asia/Seoul',
  })
  async handleWeeklyPensionResultCheck() {
    this.logger.log('🎱 Starting weekly pension result check...');

    try {
      await this.commandBus.execute(new SyncPensionDrawsCommand());

      const latest = await this.pensionDrawRepository.findLatest();
      if (!latest) {
        this.logger.warn('No pension draws found');
        return;
      }

      const checkCommand = new CheckPensionResultsCommand(latest.id);
      const checkResult = await this.commandBus.execute(checkCommand);

      if (!checkResult || checkResult.results.length === 0) {
        this.logger.warn(`No pension recommendations for draw #${latest.id}`);
        return;
      }

      const message: PensionResultMessage = {
        drawId: checkResult.drawId,
        winningGroupNo: checkResult.winningGroupNo,
        winningDigits: checkResult.winningDigits,
        results: checkResult.results.map(
          (r: {
            gameNumber: number;
            type: string;
            groupNo: number;
            digits: string;
            prizeRank: number | null;
          }) => ({
            gameNumber: r.gameNumber,
            type: r.type,
            groupNo: r.groupNo,
            digits: r.digits,
            prizeRank: r.prizeRank,
          }),
        ),
      };

      const sent = await this.telegramService.sendPensionResult(message);
      if (sent) {
        this.logger.log(`✅ Pension result sent for draw #${latest.id}`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to check weekly pension results:', error);
    }
  }

  /**
   * 매주 토요일 오후 10시 30분 - 로또 통계 갱신
   * Cron: 30 22 * * 6 (토요일 22:30)
   */
  @Cron('30 22 * * 6', {
    name: 'lotto-statistics-update',
    timeZone: 'Asia/Seoul',
  })
  async handleLottoStatisticsUpdate() {
    this.logger.log('📊 Updating lotto statistics...');

    try {
      await this.commandBus.execute(new SyncDrawsCommand());
      this.logger.log('✅ Lotto statistics updated');
    } catch (error) {
      this.logger.error('❌ Failed to update lotto statistics:', error);
    }
  }

  /**
   * 매주 금요일 오후 1시 - 연금복권 DB(통계) 갱신 후 텔레그램 알림
   * Cron: 0 13 * * 5 (금요일 13:00)
   */
  @Cron('0 13 * * 5', {
    name: 'pension-statistics-update',
    timeZone: 'Asia/Seoul',
  })
  async handlePensionStatisticsUpdate() {
    this.logger.log('📊 Updating pension statistics...');

    try {
      const result = await this.commandBus.execute(new SyncPensionDrawsCommand());
      this.logger.log('✅ Pension statistics updated');

      const msg =
        result.syncedCount > 0
          ? `🎱 <b>연금 당첨 데이터 동기화 완료</b>\n\n` +
          `새로 반영: <b>${result.syncedCount}건</b> (회차 ${result.newDraws?.join(', ') ?? '-'})\n` +
          `범위: ${result.startDrawId} ~ ${result.endDrawId}회`
          : `🎱 <b>연금 당첨 데이터 동기화 완료</b>\n\n` +
          `변경 없음 (최신 상태 유지)\n` +
          `현재 최신: ${result.endDrawId}회`;
      await this.telegramService.sendMessage(msg);
    } catch (error) {
      this.logger.error('❌ Failed to update pension statistics:', error);
    }
  }
}
