import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * 연금복권720+ 범위 조회 API (selectPstPt720Info.do) 응답 행
 * - srchStrPsltEpsd, srchEndPsltEpsd 로 회차 범위 지정, 한 번에 여러 회차 조회 가능
 * - 1등 당첨번호(조 wnBndNo + 6자리 wnRnkVl), 추첨일(psltRflYmd) 포함
 */
export interface DhPensionInfoRow {
  rnum: number;
  wnSqNo: number;       // 1~7: 1~7등, 21: 보너스(8등)
  wnAmt: number;
  wnBndNo: string | null;  // 1등 조 번호 (1~5)
  wnRnkVl: string;      // 당첨 번호 값 (1등은 6자리, 2~7등은 끝 N자리)
  psltRflYmd: string;   // 추첨일 YYYYMMDD
  psltEpsd: number;     // 회차
  psltSn: number;       // 1~8 (8=보너스)
  ltGdsCd: string;
}

export interface DhPensionInfoApiResponse {
  resultCode: string | null;
  resultMessage: string | null;
  data: {
    result: DhPensionInfoRow[];
  } | null;
}

/**
 * 연금복권720+ API 응답 내 회차별 rank 행 (selectPstPt720WnInfo.do - 당첨자 수용)
 */
export interface DhPensionRankRow {
  ltEpsd: number;
  wnRnk: number;
  wnInternetCnt: number;
  wnStoreCnt: number;
  wnTotalCnt: number;
  wnAmt: number;
  totAmt: number;
}

export interface DhPensionApiResponse {
  resultCode: string | null;
  resultMessage: string | null;
  data: {
    result: DhPensionRankRow[];
  } | null;
}

/**
 * 파싱된 연금복권 회차 정보
 */
export interface PensionDrawInfo {
  drawId: number;
  drawDate: Date | null;
  groupNo: number | null;
  digits: string | null;
  prizes: (number | null)[];   // index 0 = 1등, .. 7 = 8등
  winners: (number | null)[];  // index 0 = 1등, .. (WnInfo API에서만 채움)
}

const PT720_INFO_URL = 'https://www.dhlottery.co.kr/pt720/selectPstPt720Info.do';
const PT720_WN_INFO_URL = 'https://www.dhlottery.co.kr/pt720/selectPstPt720WnInfo.do';

/** 한 번에 조회할 최대 회차 수 (API 안정성) */
const INFO_PAGE_SIZE = 100;

@Injectable()
export class DhPensionClient {
  private readonly logger = new Logger(DhPensionClient.name);

  constructor(private readonly httpService: HttpService) { }

  /**
   * 회차 범위 조회 (selectPstPt720Info.do) — 한 번에 여러 회차, 1등 당첨번호·추첨일 포함
   */
  async getDrawRange(
    startEpisode: number,
    endEpisode: number,
  ): Promise<PensionDrawInfo[]> {
    const results: PensionDrawInfo[] = [];
    let start = startEpisode;
    const end = endEpisode;

    while (start <= end) {
      const chunkEnd = Math.min(start + INFO_PAGE_SIZE - 1, end);
      const url = `${PT720_INFO_URL}?srchStrPsltEpsd=${start}&srchEndPsltEpsd=${chunkEnd}`;
      try {
        const response = await firstValueFrom(
          this.httpService.get<DhPensionInfoApiResponse>(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'application/json',
            },
          }),
        );

        const rows = response.data?.data?.result;
        if (!rows?.length) {
          start = chunkEnd + 1;
          continue;
        }

        const parsed = this.parseInfoResult(rows);
        for (const p of parsed) {
          results.push(p);
        }
        start = chunkEnd + 1;

        if (start <= end) {
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch pension range ${start}-${chunkEnd}:`,
          error,
        );
        start = chunkEnd + 1;
      }
    }

    results.sort((a, b) => a.drawId - b.drawId);
    return results;
  }

  /**
   * 최신 회차 번호 조회 (범위 API로 1~N 조회 후 최대 회차 반환)
   */
  async getLatestDrawId(): Promise<number> {
    const maxAttempt = 500;
    const step = 100;
    let lastValid = 1;
    for (let start = 1; start <= maxAttempt; start += step) {
      const end = Math.min(start + step - 1, maxAttempt);
      const list = await this.getDrawRange(start, end);
      if (list.length === 0) break;
      lastValid = Math.max(...list.map((d) => d.drawId));
      if (list.length < end - start + 1) break;
    }
    return lastValid;
  }

  /**
   * 특정 회차 당첨 정보 조회 (범위 1건으로 조회)
   */
  async getDrawResult(episode: number): Promise<PensionDrawInfo | null> {
    const list = await this.getDrawRange(episode, episode);
    return list[0] ?? null;
  }

  /**
   * selectPstPt720Info.do 응답을 회차별 PensionDrawInfo[] 로 변환
   * - psltSn 1=1등, 2~7=2~7등, 8(wnSqNo=21)=8등(보너스)
   * - 1등: wnBndNo=조, wnRnkVl=6자리
   */
  private parseInfoResult(rows: DhPensionInfoRow[]): PensionDrawInfo[] {
    const byEpisode = new Map<number, DhPensionInfoRow[]>();
    for (const row of rows) {
      const list = byEpisode.get(row.psltEpsd) ?? [];
      list.push(row);
      byEpisode.set(row.psltEpsd, list);
    }

    const result: PensionDrawInfo[] = [];
    for (const [episode, list] of byEpisode.entries()) {
      const first = list[0];
      let drawDate: Date | null = null;
      if (first?.psltRflYmd?.length === 8) {
        const y = parseInt(first.psltRflYmd.slice(0, 4), 10);
        const m = parseInt(first.psltRflYmd.slice(4, 6), 10) - 1;
        const d = parseInt(first.psltRflYmd.slice(6, 8), 10);
        drawDate = new Date(y, m, d);
      }

      let groupNo: number | null = null;
      let digits: string | null = null;
      const prizes: (number | null)[] = new Array(8).fill(null);
      const winners: (number | null)[] = new Array(8).fill(null);

      for (const row of list) {
        if (row.psltSn === 1) {
          if (row.wnBndNo != null && row.wnBndNo !== '') {
            const n = parseInt(row.wnBndNo, 10);
            if (!Number.isNaN(n)) groupNo = n;
          }
          if (row.wnRnkVl != null && row.wnRnkVl.length >= 6) {
            digits = row.wnRnkVl.slice(-6);
          }
        }

        let rankIdx: number;
        if (row.psltSn >= 1 && row.psltSn <= 7) {
          rankIdx = row.psltSn - 1;
        } else if (row.psltSn === 8 && row.wnSqNo === 21) {
          rankIdx = 7;
        } else {
          continue;
        }
        if (rankIdx >= 0 && rankIdx < 8) {
          prizes[rankIdx] = row.wnAmt ?? null;
        }
      }

      result.push({
        drawId: episode,
        drawDate,
        groupNo,
        digits,
        prizes,
        winners,
      });
    }

    return result.sort((a, b) => a.drawId - b.drawId);
  }
}
