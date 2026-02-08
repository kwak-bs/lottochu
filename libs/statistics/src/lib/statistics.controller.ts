import { Controller, Get, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * 전체 통계 조회
   * GET /statistics
   */
  @Get()
  async getStatistics() {
    return this.statisticsService.calculateStatistics();
  }

  /**
   * 후보 번호 조회 (하위 번호 제외)
   * GET /statistics/candidates?exclude=20
   */
  @Get('candidates')
  async getCandidates(@Query('exclude') exclude?: string) {
    const excludeCount = exclude ? parseInt(exclude, 10) : 20;
    const candidates = await this.statisticsService.getCandidateNumbers(
      excludeCount,
    );

    return {
      excludedCount: excludeCount,
      candidateCount: candidates.length,
      candidates,
    };
  }

  /**
   * 가장 많이 나온 번호 TOP 10
   * GET /statistics/most-frequent
   */
  @Get('most-frequent')
  async getMostFrequent() {
    const stats = await this.statisticsService.calculateStatistics();
    return {
      totalDraws: stats.totalDraws,
      mostFrequent: stats.mostFrequent,
    };
  }

  /**
   * 가장 적게 나온 번호 TOP 10
   * GET /statistics/least-frequent
   */
  @Get('least-frequent')
  async getLeastFrequent() {
    const stats = await this.statisticsService.calculateStatistics();
    return {
      totalDraws: stats.totalDraws,
      leastFrequent: stats.leastFrequent,
    };
  }
}
