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

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 전체 통계 계산
   */
  async calculateStatistics(): Promise<StatisticsSummary> {
    const draws = await this.dataSource.query<DrawEntity[]>(
      'SELECT id, numbers, bonus_number as "bonusNumber" FROM draws ORDER BY id ASC',
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
}
