import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

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

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID') || '';
    this.isEnabled = !!token && !!this.chatId;

    if (token) {
      this.bot = new Telegraf(token);
    }
  }

  async onModuleInit() {
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
        this.logger.error(`Failed to send Telegram message (attempt ${attempt}/${maxRetries}):`, error);
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
    return this.sendMessage(message);
  }

  /**
   * 결과 메시지 전송
   */
  async sendResult(data: ResultMessage): Promise<boolean> {
    const message = this.formatResultMessage(data);
    return this.sendMessage(message);
  }

  /**
   * 연금복권 추천 메시지 전송
   */
  async sendPensionRecommendation(
    data: PensionRecommendationMessage,
  ): Promise<boolean> {
    const message = this.formatPensionRecommendationMessage(data);
    return this.sendMessage(message);
  }

  /**
   * 연금복권 결과 메시지 전송
   */
  async sendPensionResult(data: PensionResultMessage): Promise<boolean> {
    const message = this.formatPensionResultMessage(data);
    return this.sendMessage(message);
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
    const lines: string[] = [
      `🎯 <b>${data.drawId}회 당첨 결과</b>`,
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
        lines.push(
          `${emoji} ${r.numbers.join(', ')} → ${matchEmoji} ${r.matchedCount}개`,
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
        const prizeText = r.prizeRank ? ` (${r.prizeRank}등!)` : '';
        lines.push(
          `${emoji} ${r.numbers.join(', ')} → ${matchEmoji} ${r.matchedCount}개${prizeText}`,
        );
      }
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 최고 성적
    const bestResult = data.results.reduce((best, curr) => {
      if (!best || curr.matchedCount > best.matchedCount) return curr;
      return best;
    }, data.results[0]);

    if (bestResult && bestResult.prizeRank) {
      lines.push(`🏆 이번 주 최고: ${bestResult.prizeRank}등 (${bestResult.gameNumber}번 게임)`);
    } else {
      lines.push(`🏆 이번 주 최고: ${bestResult?.matchedCount || 0}개 일치`);
    }

    return lines.join('\n');
  }

  private getGameEmoji(gameNumber: number): string {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    return emojis[gameNumber - 1] || `${gameNumber}.`;
  }

  private getMatchEmoji(matchedCount: number, prizeRank: number | null): string {
    if (prizeRank === 1) return '🎉🎉🎉';
    if (prizeRank === 2) return '🎉🎉';
    if (prizeRank === 3) return '🎉';
    if (prizeRank === 4) return '👍';
    if (prizeRank === 5) return '⚪';
    if (matchedCount === 0) return '❌';
    return '⚪';
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

    const lines: string[] = [
      `🎱 <b>${data.drawId}회 연금복권 당첨 결과</b>`,
      '',
      `당첨번호: <b>${winningStr}</b>`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
    ];

    const statResults = data.results.filter((r) => r.type === 'STATISTICAL');
    if (statResults.length > 0) {
      lines.push('📊 <b>통계 기반:</b>');
      for (const r of statResults) {
        const emoji = this.getGameEmoji(r.gameNumber);
        const rankText = r.prizeRank ? ` (${r.prizeRank}등!)` : '';
        lines.push(`${emoji} ${r.groupNo}조 ${r.digits} → ${rankText || '낙첨'}`);
      }
    }

    lines.push('');

    const aiResults = data.results.filter((r) => r.type === 'AI');
    if (aiResults.length > 0) {
      lines.push('🤖 <b>AI 추천:</b>');
      for (const r of aiResults) {
        const emoji = this.getGameEmoji(r.gameNumber);
        const rankText = r.prizeRank ? ` (${r.prizeRank}등!)` : '';
        lines.push(`${emoji} ${r.groupNo}조 ${r.digits} → ${rankText || '낙첨'}`);
      }
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━');

    const bestResult = data.results.reduce(
      (best, curr) =>
        curr.prizeRank != null &&
          (best == null || curr.prizeRank! < best.prizeRank!)
          ? curr
          : best,
      data.results[0] as (typeof data.results)[0] | undefined,
    );

    if (bestResult?.prizeRank) {
      lines.push(
        `🏆 이번 회 최고: ${bestResult.prizeRank}등 (${bestResult.gameNumber}번 게임)`,
      );
    } else {
      lines.push('🏆 이번 회: 낙첨');
    }

    return lines.join('\n');
  }
}
