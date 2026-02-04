import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * 동행복권 신규 API 응답 내 개별 회차 데이터
 */
export interface DhLotteryDrawData {
  ltEpsd: number; // 회차
  tm1WnNo: number; // 당첨번호 1
  tm2WnNo: number; // 당첨번호 2
  tm3WnNo: number; // 당첨번호 3
  tm4WnNo: number; // 당첨번호 4
  tm5WnNo: number; // 당첨번호 5
  tm6WnNo: number; // 당첨번호 6
  bnsWnNo: number; // 보너스 번호
  ltRflYmd: string; // 추첨일 (YYYYMMDD)
  rnk1WnAmt: number; // 1등 당첨금
  rnk1WnNope: number; // 1등 당첨자 수
  rnk2WnAmt: number; // 2등 당첨금
  rnk2WnNope: number; // 2등 당첨자 수
  rnk3WnAmt: number; // 3등 당첨금
  rnk3WnNope: number; // 3등 당첨자 수
}

/**
 * 동행복권 신규 API 응답 인터페이스
 */
export interface DhLotteryAllResponse {
  resultCode: string | null;
  resultMessage: string | null;
  data: {
    list: DhLotteryDrawData[];
  };
}

/**
 * 파싱된 로또 당첨 정보
 */
export interface LottoDrawInfo {
  drawId: number;
  drawDate: Date;
  numbers: number[];
  bonusNumber: number;
  prize1st: number;
  winners1st: number;
  prize2nd: number;
  winners2nd: number;
  prize3rd: number;
  winners3rd: number;
}

/**
 * 동행복권 API 클라이언트
 * 신규 API: https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=all
 */
@Injectable()
export class DhLotteryClient {
  private readonly logger = new Logger(DhLotteryClient.name);
  private readonly allDrawsUrl =
    'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=all';

  // 캐시: 모든 회차 데이터
  private cachedDraws: Map<number, LottoDrawInfo> = new Map();
  private cacheTimestamp: number | null = null;
  private readonly cacheValidityMs = 1000 * 60 * 60; // 1시간

  constructor(private readonly httpService: HttpService) {}

  /**
   * 모든 회차 데이터 가져오기 (캐시 포함)
   */
  async getAllDraws(): Promise<LottoDrawInfo[]> {
    if (this.isCacheValid()) {
      this.logger.debug('Using cached draw data');
      return Array.from(this.cachedDraws.values()).sort(
        (a, b) => a.drawId - b.drawId,
      );
    }

    try {
      this.logger.log('Fetching all draws from DhLottery API...');

      const response = await firstValueFrom(
        this.httpService.get<DhLotteryAllResponse>(this.allDrawsUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'application/json',
          },
        }),
      );

      const draws = response.data.data.list;
      this.logger.log(`Fetched ${draws.length} draws from API`);

      // 캐시 초기화 및 저장
      this.cachedDraws.clear();

      const result: LottoDrawInfo[] = [];
      for (const draw of draws) {
        const parsed = this.parseDrawData(draw);
        this.cachedDraws.set(parsed.drawId, parsed);
        result.push(parsed);
      }

      this.cacheTimestamp = Date.now();

      return result.sort((a, b) => a.drawId - b.drawId);
    } catch (error) {
      this.logger.error('Failed to fetch all draws:', error);
      throw error;
    }
  }

  /**
   * 특정 회차의 당첨 정보 조회
   */
  async getDrawResult(drawId: number): Promise<LottoDrawInfo | null> {
    // 캐시에서 먼저 확인
    if (this.cachedDraws.has(drawId) && this.isCacheValid()) {
      return this.cachedDraws.get(drawId) || null;
    }

    // 캐시가 없거나 만료되면 전체 데이터 새로 가져오기
    await this.getAllDraws();

    return this.cachedDraws.get(drawId) || null;
  }

  /**
   * 최신 회차 번호 조회
   */
  async getLatestDrawId(): Promise<number> {
    const allDraws = await this.getAllDraws();

    if (allDraws.length === 0) {
      throw new Error('No draws found');
    }

    const latestId = Math.max(...allDraws.map((d) => d.drawId));
    this.logger.log(`Latest draw ID: ${latestId}`);
    return latestId;
  }

  /**
   * 범위 내 모든 회차 조회
   */
  async getDrawRange(
    startId: number,
    endId: number,
  ): Promise<LottoDrawInfo[]> {
    const allDraws = await this.getAllDraws();

    return allDraws.filter((d) => d.drawId >= startId && d.drawId <= endId);
  }

  /**
   * API 응답 데이터를 LottoDrawInfo로 변환
   */
  private parseDrawData(draw: DhLotteryDrawData): LottoDrawInfo {
    // 날짜 파싱 (YYYYMMDD -> Date)
    const dateStr = draw.ltRflYmd;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // 0-indexed
    const day = parseInt(dateStr.substring(6, 8));

    return {
      drawId: draw.ltEpsd,
      drawDate: new Date(year, month, day),
      numbers: [
        draw.tm1WnNo,
        draw.tm2WnNo,
        draw.tm3WnNo,
        draw.tm4WnNo,
        draw.tm5WnNo,
        draw.tm6WnNo,
      ].sort((a, b) => a - b),
      bonusNumber: draw.bnsWnNo,
      prize1st: draw.rnk1WnAmt,
      winners1st: draw.rnk1WnNope,
      prize2nd: draw.rnk2WnAmt,
      winners2nd: draw.rnk2WnNope,
      prize3rd: draw.rnk3WnAmt,
      winners3rd: draw.rnk3WnNope,
    };
  }

  /**
   * 캐시가 유효한지 확인
   */
  private isCacheValid(): boolean {
    if (!this.cacheTimestamp || this.cachedDraws.size === 0) {
      return false;
    }
    return Date.now() - this.cacheTimestamp < this.cacheValidityMs;
  }

  /**
   * 캐시 강제 갱신
   */
  async refreshCache(): Promise<void> {
    this.cacheTimestamp = null;
    await this.getAllDraws();
  }
}
