import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { NotificationEventType } from './notification-delivery.entity';
import { NotificationDeliveryRepository } from './notification-delivery.repository';

/**
 * 추천 번호 메시지용 데이터
 */
export interface RecommendationMessage {
  targetDrawId: number;
  drawDate: string;
  statistical: { gameNumber: number; numbers: number[] }[];
  ai: { gameNumber: number; numbers: number[]; reasoning: string }[];
}

/**
 * 결과 메시지용 데이터
 */
export interface ResultMessage {
  drawId: number;
  winningNumbers: number[];
  bonusNumber: number;
  prizeByRank: {
    1: string | null;
    2: string | null;
    3: string | null;
    4: string | null;
    5: string | null;
  };
  results: {
    gameNumber: number;
    type: string;
    numbers: number[];
    matchedCount: number;
    matchedNumbers: number[];
    hasBonus: boolean;
    prizeRank: number | null;
  }[];
}

/**
 * 연금복권 추천 메시지용 데이터
 */
export interface PensionRecommendationMessage {
  targetDrawId: number;
  drawDate: string;
  statistical: { gameNumber: number; groupNo: number; digits: string }[];
  ai: {
    gameNumber: number;
    groupNo: number;
    digits: string;
    reasoning: string;
  }[];
}

/**
 * 연금복권 결과 메시지용 데이터
 */
export interface PensionResultMessage {
  drawId: number;
  winningGroupNo: number | null;
  winningDigits: string | null;
  winningBonusDigits: string | null;
  prizeByRank: {
    1: string | null;
    2: string | null;
    3: string | null;
    4: string | null;
    5: string | null;
    6: string | null;
    7: string | null;
    8: string | null;
  };
  results: {
    gameNumber: number;
    type: string;
    groupNo: number;
    digits: string;
    prizeRank: number | null;
  }[];
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  private readonly chatId: string;
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly deliveryRepository: NotificationDeliveryRepository,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID') || '';
    this.isEnabled = !!token && !!this.chatId;

    if (token) {
      this.bot = new Telegraf(token);
    }
  }

  onModuleInit(): void {
    if (this.isEnabled) {
      this.logger.log('Telegram bot initialized');
    } else {
      this.logger.warn(
        'Telegram bot is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env',
      );
    }
  }

  /**
   * 텔레그램 봇 활성화 여부 확인
   */
  isActive(): boolean {
    return this.isEnabled;
  }

  /**
   * 일반 메시지 전송
   */
  async sendMessage(message: string): Promise<boolean> {
    if (!this.isEnabled || !this.bot) {
      this.logger.warn('Telegram is not configured, message not sent');
      return false;
    }

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.bot.telegram.sendMessage(this.chatId, message, {
          parse_mode: 'HTML',
        });
        this.logger.log('Message sent to Telegram');
        return true;
      } catch (error) {
        this.logger.error(
          `Failed to send Telegram message (attempt ${attempt}/${maxRetries}):`,
          error,
        );
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }
    return false;
  }

  /**
   * 추천 번호 메시지 전송
   */
  async sendRecommendation(data: RecommendationMessage): Promise<boolean> {
    const message = this.formatRecommendationMessage(data);
    return this.sendTrackedMessage(
      NotificationEventType.LOTTO_RECOMMENDATION,
      data.targetDrawId,
      message,
    );
  }

  /**
   * 결과 메시지 전송
   */
  async sendResult(data: ResultMessage): Promise<boolean> {
    const message = this.formatResultMessage(data);
    return this.sendTrackedMessage(
      NotificationEventType.LOTTO_RESULT,
      data.drawId,
      message,
    );
  }

  /**
   * 연금복권 추천 메시지 전송
   */
  async sendPensionRecommendation(
    data: PensionRecommendationMessage,
  ): Promise<boolean> {
    const message = this.formatPensionRecommendationMessage(data);
    return this.sendTrackedMessage(
      NotificationEventType.PENSION_RECOMMENDATION,
      data.targetDrawId,
      message,
    );
  }

  /**
   * 연금복권 결과 메시지 전송
   */
  async sendPensionResult(data: PensionResultMessage): Promise<boolean> {
    const message = this.formatPensionResultMessage(data);
    return this.sendTrackedMessage(
      NotificationEventType.PENSION_RESULT,
      data.drawId,
      message,
    );
  }

  private async sendTrackedMessage(
    eventType: NotificationEventType,
    drawId: number,
    message: string,
  ): Promise<boolean> {
    if (!this.isEnabled || !this.bot) {
      this.logger.warn('Telegram is not configured, message not sent');
      return false;
    }

    const claimed = await this.deliveryRepository.claim(eventType, drawId);
    if (!claimed) {
      this.logger.log(
        `Skipping duplicate Telegram delivery: ${eventType} draw #${drawId}`,
      );
      return true;
    }

    try {
      const sent = await this.sendMessage(message);
      if (sent) {
        await this.deliveryRepository.markSent(eventType, drawId);
        return true;
      }

      await this.deliveryRepository.markFailed(
        eventType,
        drawId,
        new Error('Telegram delivery failed after retries'),
      );
      return false;
    } catch (error) {
      await this.deliveryRepository.markFailed(eventType, drawId, error);
      throw error;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * 추천 번호 메시지 포맷팅
   */
  private formatRecommendationMessage(data: RecommendationMessage): string {
    const lines: string[] = [
      `🎰 <b>${data.targetDrawId}회 로또 번호 추천</b>`,
      '',
      '📊 <b>통계 기반 (저빈도 제외):</b>',
    ];

    for (const stat of data.statistical) {
      const emoji = this.getGameEmoji(stat.gameNumber);
      lines.push(`${emoji} ${stat.numbers.join(', ')}`);
    }

    lines.push('');
    lines.push('🤖 <b>AI 추천:</b>');

    for (const ai of data.ai) {
      const emoji = this.getGameEmoji(ai.gameNumber);
      lines.push(`${emoji} ${ai.numbers.join(', ')}`);
      lines.push(`   └ <i>${this.escapeHtml(ai.reasoning)}</i>`);
    }

    lines.push('');
    lines.push(`💰 총 구매금액: 5,000원`);
    lines.push(`📅 추첨일: ${data.drawDate}`);

    return lines.join('\n');
  }

  /**
   * 결과 메시지 포맷팅
   */
  private formatResultMessage(data: ResultMessage): string {
    const winningResults = data.results.filter((r) => r.prizeRank != null);
    const bestRank = winningResults.reduce<number | null>(
      (best, result) =>
        best == null || result.prizeRank! < best ? result.prizeRank : best,
      null,
    );
    const title =
      bestRank != null && bestRank <= 3
        ? `🚨🎉 <b>${data.drawId}회 로또 고액 당첨!</b>`
        : bestRank != null
          ? `🎉 <b>${data.drawId}회 로또 당첨을 축하합니다!</b>`
          : `🎯 <b>${data.drawId}회 로또 결과</b>`;
    const lines: string[] = [
      title,
      '',
      `당첨번호: <b>${data.winningNumbers.join(', ')}</b> + 🔴 ${data.bonusNumber}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
    ];

    // 통계 기반 결과
    const statResults = data.results.filter((r) => r.type === 'STATISTICAL');
    if (statResults.length > 0) {
      lines.push('📊 <b>통계 기반:</b>');
      for (const r of statResults) {
        const emoji = this.getGameEmoji(r.gameNumber);
        const matchEmoji = this.getMatchEmoji(r.matchedCount, r.prizeRank);
        const prizeText = this.getLottoPrizeText(r.prizeRank, data.prizeByRank);
        lines.push(
          `${emoji} ${r.numbers.join(', ')} → ${matchEmoji} ${r.matchedCount}개${prizeText}`,
        );
      }
    }

    lines.push('');

    // AI 기반 결과
    const aiResults = data.results.filter((r) => r.type === 'AI');
    if (aiResults.length > 0) {
      lines.push('🤖 <b>AI 추천:</b>');
      for (const r of aiResults) {
        const emoji = this.getGameEmoji(r.gameNumber);
        const matchEmoji = this.getMatchEmoji(r.matchedCount, r.prizeRank);
        const prizeText = this.getLottoPrizeText(r.prizeRank, data.prizeByRank);
        lines.push(
          `${emoji} ${r.numbers.join(', ')} → ${matchEmoji} ${r.matchedCount}개${prizeText}`,
        );
      }
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━');

    const bestResult = winningResults.sort(
      (a, b) => a.prizeRank! - b.prizeRank!,
    )[0];
    const totalPrize = winningResults.reduce((sum, result) => {
      const value =
        data.prizeByRank[
          result.prizeRank! as keyof ResultMessage['prizeByRank']
        ];
      const amount = Number(value);
      return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);

    if (bestResult) {
      lines.push(`🎊 당첨 ${winningResults.length}/${data.results.length}게임`);
      lines.push(
        `🏆 최고 ${bestResult.prizeRank}등 (${bestResult.gameNumber}번 게임)`,
      );
      if (totalPrize > 0) {
        lines.push(
          `💰 예상 총 당첨금: <b>${this.formatAmount(totalPrize)}</b>`,
        );
      }
      lines.push('⚠️ 복권을 안전하게 보관하고 공식 당첨 결과를 확인하세요.');
    } else {
      const matchedCount = data.results.reduce(
        (best, result) => Math.max(best, result.matchedCount),
        0,
      );
      lines.push(`🍀 이번 회는 아쉽게 낙첨 (최고 ${matchedCount}개 일치)`);
      lines.push('다음 회차도 무리하지 않는 선에서 행운을 빌어요!');
    }

    return lines.join('\n');
  }

  private getGameEmoji(gameNumber: number): string {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    return emojis[gameNumber - 1] || `${gameNumber}.`;
  }

  private getMatchEmoji(
    matchedCount: number,
    prizeRank: number | null,
  ): string {
    if (prizeRank === 1) return '🎉🎉🎉';
    if (prizeRank === 2) return '🎉🎉';
    if (prizeRank === 3) return '🎉';
    if (prizeRank === 4) return '👍';
    if (prizeRank === 5) return '⚪';
    if (matchedCount === 0) return '❌';
    return '⚪';
  }

  private getLottoPrizeText(
    prizeRank: number | null,
    prizeByRank: ResultMessage['prizeByRank'],
  ): string {
    if (prizeRank == null) return '';
    const prize = prizeByRank[prizeRank as keyof ResultMessage['prizeByRank']];
    const moneyText = this.formatMoney(prize);
    if (!moneyText) return ` (${prizeRank}등)`;
    return ` (${prizeRank}등 · ${moneyText})`;
  }

  private getPensionPrizeText(
    prizeRank: number | null,
    prizeByRank: PensionResultMessage['prizeByRank'],
  ): string {
    if (prizeRank == null) return '낙첨';
    const prize =
      prizeByRank[prizeRank as keyof PensionResultMessage['prizeByRank']];
    const moneyText = this.formatMoney(prize);
    if (!moneyText) return `${prizeRank}등`;
    return `${prizeRank}등 · ${moneyText}`;
  }

  private formatMoney(value: string | null): string | null {
    if (value == null) return null;
    const amount = Number(value);
    if (!Number.isFinite(amount)) return null;
    return this.formatAmount(amount);
  }

  private formatAmount(amount: number): string {
    return `${amount.toLocaleString('ko-KR')}원`;
  }

  /**
   * 연금복권 추천 메시지 포맷팅
   */
  private formatPensionRecommendationMessage(
    data: PensionRecommendationMessage,
  ): string {
    const lines: string[] = [
      '━━━━━━━━━━━━━━━━━━━━',
      `🎱 <b>연금복권720+ ${data.targetDrawId}회 추천</b>`,
      '━━━━━━━━━━━━━━━━━━━━',
      '',
      '📊 <b>통계 기반</b> (5게임 · 5,000원)',
      '',
    ];

    for (const stat of data.statistical) {
      const emoji = this.getGameEmoji(stat.gameNumber);
      lines.push(`  ${emoji} <b>${stat.groupNo}조</b>  ${stat.digits}`);
    }

    if (data.ai.length > 0) {
      lines.push('');
      lines.push('🤖 <b>AI 추천</b>');
      lines.push('');
      for (const ai of data.ai) {
        const emoji = this.getGameEmoji(ai.gameNumber);
        lines.push(`  ${emoji} <b>${ai.groupNo}조</b>  ${ai.digits}`);
        lines.push(`     <i>${this.escapeHtml(ai.reasoning)}</i>`);
        lines.push('');
      }
    }

    lines.push('──────────────────');
    lines.push(`📅 추첨일  ${data.drawDate}`);
    lines.push('━━━━━━━━━━━━━━━━━━━━');

    return lines.join('\n');
  }

  /**
   * 연금복권 결과 메시지 포맷팅
   */
  private formatPensionResultMessage(data: PensionResultMessage): string {
    const winningStr =
      data.winningGroupNo != null && data.winningDigits != null
        ? `${data.winningGroupNo}조 ${data.winningDigits}`
        : '(당첨번호 미등록)';

    const winningResults = data.results.filter((r) => r.prizeRank != null);
    const bestResult = winningResults.sort((a, b) => {
      const priority = (rank: number) => (rank === 8 ? 2.5 : rank);
      return priority(a.prizeRank!) - priority(b.prizeRank!);
    })[0];
    const isHighPrize =
      bestResult?.prizeRank === 1 ||
      bestResult?.prizeRank === 2 ||
      bestResult?.prizeRank === 8;
    const title = isHighPrize
      ? `🚨🎉 <b>${data.drawId}회 연금복권 고액 당첨!</b>`
      : bestResult
        ? `🎉 <b>${data.drawId}회 연금복권 당첨을 축하합니다!</b>`
        : `🎱 <b>${data.drawId}회 연금복권 결과</b>`;

    const lines: string[] = [
      title,
      '',
      `당첨번호: <b>${winningStr}</b>`,
      `보너스번호: <b>${data.winningBonusDigits ?? '(미등록)'}</b>`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
    ];

    const statResults = data.results.filter((r) => r.type === 'STATISTICAL');
    if (statResults.length > 0) {
      lines.push('📊 <b>통계 기반:</b>');
      for (const r of statResults) {
        const emoji = this.getGameEmoji(r.gameNumber);
        const prizeText = this.getPensionPrizeText(
          r.prizeRank,
          data.prizeByRank,
        );
        lines.push(`${emoji} ${r.groupNo}조 ${r.digits} → ${prizeText}`);
      }
    }

    lines.push('');

    const aiResults = data.results.filter((r) => r.type === 'AI');
    if (aiResults.length > 0) {
      lines.push('🤖 <b>AI 추천:</b>');
      for (const r of aiResults) {
        const emoji = this.getGameEmoji(r.gameNumber);
        const prizeText = this.getPensionPrizeText(
          r.prizeRank,
          data.prizeByRank,
        );
        lines.push(`${emoji} ${r.groupNo}조 ${r.digits} → ${prizeText}`);
      }
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (bestResult?.prizeRank) {
      lines.push(`🎊 당첨 ${winningResults.length}/${data.results.length}게임`);
      lines.push(
        `🏆 최고 ${bestResult.prizeRank}등 (${bestResult.gameNumber}번 게임)`,
      );
      const recurringPrize = this.getPensionRecurringPrize(
        bestResult.prizeRank,
      );
      if (recurringPrize) lines.push(`💰 당첨금: <b>${recurringPrize}</b>`);
      lines.push('⚠️ 복권을 안전하게 보관하고 공식 당첨 결과를 확인하세요.');
    } else {
      lines.push('🍀 이번 회는 아쉽게 낙첨');
      lines.push('다음 회차도 무리하지 않는 선에서 행운을 빌어요!');
    }

    return lines.join('\n');
  }

  private getPensionRecurringPrize(rank: number): string | null {
    if (rank === 1) return '월 700만원 × 20년';
    if (rank === 2 || rank === 8) return '월 100만원 × 10년';
    return null;
  }
}
