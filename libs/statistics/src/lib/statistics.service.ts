import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Draw 엔티티 인터페이스 (순환 의존성 방지)
 */
interface DrawEntity {
  id: number;
  numbers: number[];
  bonusNumber: number;
}

/**
 * 번호별 출현 빈도
 */
export interface NumberFrequency {
  number: number;
  count: number;
  percentage: number;
  lastAppeared: number | null; // 마지막 출현 회차
}

/**
 * 통계 요약
 */
export interface StatisticsSummary {
  totalDraws: number;
  frequencies: NumberFrequency[];
  mostFrequent: NumberFrequency[];
  leastFrequent: NumberFrequency[];
}

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(private readonly dataSource: DataSource) { }

  /**
   * 전체 통계 계산
   */
  async calculateStatistics(): Promise<StatisticsSummary> {
    const draws = await this.dataSource.query<DrawEntity[]>(
      'SELECT id, numbers, bonus_number as "bonusNumber" FROM lotto_draws ORDER BY id ASC',
    );

    if (draws.length === 0) {
      return {
        totalDraws: 0,
        frequencies: [],
        mostFrequent: [],
        leastFrequent: [],
      };
    }

    // 번호별 출현 횟수 및 마지막 출현 회차 계산
    const frequencyMap = new Map<number, { count: number; lastAppeared: number }>();

    // 1~45 초기화
    for (let i = 1; i <= 45; i++) {
      frequencyMap.set(i, { count: 0, lastAppeared: 0 });
    }

    // 각 회차의 번호들 카운트
    for (const draw of draws) {
      for (const num of draw.numbers) {
        const current = frequencyMap.get(num)!;
        current.count++;
        if (draw.id > current.lastAppeared) {
          current.lastAppeared = draw.id;
        }
      }
    }

    // 빈도 배열로 변환
    const frequencies: NumberFrequency[] = Array.from(frequencyMap.entries())
      .map(([number, data]) => ({
        number,
        count: data.count,
        percentage: (data.count / (draws.length * 6)) * 100,
        lastAppeared: data.lastAppeared || null,
      }))
      .sort((a, b) => b.count - a.count); // 빈도 높은 순

    return {
      totalDraws: draws.length,
      frequencies,
      mostFrequent: frequencies.slice(0, 10), // 상위 10개
      leastFrequent: frequencies.slice(-10).reverse(), // 하위 10개 (오름차순)
    };
  }

  /**
   * 하위 N개 번호 제외한 후보 번호 반환
   * @param excludeCount 제외할 하위 번호 개수 (기본 20개)
   */
  async getCandidateNumbers(excludeCount: number = 20): Promise<number[]> {
    const stats = await this.calculateStatistics();

    if (stats.frequencies.length === 0) {
      // 데이터가 없으면 전체 번호 반환
      return Array.from({ length: 45 }, (_, i) => i + 1);
    }

    // 빈도 낮은 순으로 정렬 후 하위 N개 제외
    const sortedByFrequency = [...stats.frequencies].sort(
      (a, b) => a.count - b.count,
    );
    const excludedNumbers = new Set(
      sortedByFrequency.slice(0, excludeCount).map((f) => f.number),
    );

    // 제외되지 않은 번호들 반환
    const candidates = stats.frequencies
      .filter((f) => !excludedNumbers.has(f.number))
      .map((f) => f.number)
      .sort((a, b) => a - b);

    this.logger.debug(
      `Candidate numbers (excluded ${excludeCount} least frequent): ${candidates.join(', ')}`,
    );

    return candidates;
  }

  /**
   * 번호별 상세 정보 조회
   */
  async getNumberDetail(number: number): Promise<NumberFrequency | null> {
    const stats = await this.calculateStatistics();
    return stats.frequencies.find((f) => f.number === number) || null;
  }

  /**
   * 연금복권: 자리별(1~6번째) 숫자(0~9) 출현 빈도 계산
   * pension_draws.digits (6자리) 기준
   */
  async getPensionDigitFrequency(): Promise<{
    totalDraws: number;
    byPosition: Array<{ digit: number; count: number }[]>;
  }> {
    const rows = await this.dataSource.query<{ digits: string }[]>(
      `SELECT digits FROM pension_draws WHERE digits IS NOT NULL AND LENGTH(digits) = 6`,
    );

    if (rows.length === 0) {
      return {
        totalDraws: 0,
        byPosition: Array.from({ length: 6 }, () => []),
      };
    }

    // byPosition[positionIndex][digit 0-9] = count
    const byPosition: number[][] = Array.from({ length: 6 }, () =>
      Array.from({ length: 10 }, () => 0),
    );

    for (const row of rows) {
      const digits = row.digits;
      if (!digits || digits.length !== 6) continue;
      for (let pos = 0; pos < 6; pos++) {
        const d = parseInt(digits[pos], 10);
        if (!Number.isNaN(d) && d >= 0 && d <= 9) {
          byPosition[pos][d]++;
        }
      }
    }

    const byPositionFormatted = byPosition.map((counts) =>
      counts
        .map((count, digit) => ({ digit, count }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count),
    );

    return {
      totalDraws: rows.length,
      byPosition: byPositionFormatted,
    };
  }

  /**
   * 연금복권: 순위별 추천 6자리 3세트 반환 (1순위·2순위·3순위)
   * 각 자리별 출현 빈도 순위(1등/2등/3등)로 조합. 해당 순위 숫자가 없으면 하위 순위 또는 랜덤으로 폴백.
   */
  async getRecommendedPensionDigitsRanked(): Promise<string[]> {
    const { totalDraws, byPosition } = await this.getPensionDigitFrequency();

    const pickAtRank = (rank: number): string => {
      const result: number[] = [];
      for (let pos = 0; pos < 6; pos++) {
        const candidates = byPosition[pos];
        if (candidates.length === 0) {
          result.push(Math.floor(Math.random() * 10));
          continue;
        }
        // rank 0 = 1순위(가장 빈도 높음), 1 = 2순위, 2 = 3순위. 없으면 하위 순위 폴백
        const idx = Math.min(rank, candidates.length - 1);
        result.push(candidates[idx].digit);
      }
      return result.join('');
    };

    if (totalDraws === 0) {
      return [
        Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join(''),
        Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join(''),
        Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join(''),
      ];
    }

    const first = pickAtRank(0);
    let second = pickAtRank(1);
    let third = pickAtRank(2);

    // 중복 방지: 2순위가 1순위와 같으면 3순위 숫자 사용 시도, 3순위가 겹치면 랜덤 한 자리 변경
    if (second === first) {
      const arr = second.split('').map(Number);
      for (let pos = 0; pos < 6; pos++) {
        const candidates = byPosition[pos];
        if (candidates.length > 1) {
          arr[pos] = candidates[1].digit;
          break;
        }
      }
      second = arr.join('');
    }
    const used = new Set([first, second]);
    if (used.has(third)) {
      const arr = third.split('').map(Number);
      for (let pos = 0; pos < 6; pos++) {
        const candidates = byPosition[pos];
        if (candidates.length > 2) {
          arr[pos] = candidates[2].digit;
        } else if (candidates.length > 1) {
          arr[pos] = candidates[1].digit;
        } else {
          arr[pos] = Math.floor(Math.random() * 10);
        }
      }
      third = arr.join('');
      if (used.has(third)) {
        // 여전히 중복이면 한 자리만 다른 후보/랜덤으로 변경
        for (let pos = 0; pos < 6; pos++) {
          const prev = arr[pos];
          for (let d = 0; d <= 9; d++) {
            if (d === prev) continue;
            arr[pos] = d;
            third = arr.join('');
            if (!used.has(third)) return [first, second, third];
          }
          arr[pos] = prev;
        }
      }
    }

    return [first, second, third];
  }
}
