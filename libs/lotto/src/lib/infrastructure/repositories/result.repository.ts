import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '../../domain/entities';

@Injectable()
export class ResultRepository {
  constructor(
    @InjectRepository(Result)
    private readonly repository: Repository<Result>,
  ) {}

  /**
   * 추천 ID로 결과 조회
   */
  async findByRecommendationId(recommendationId: string): Promise<Result | null> {
    return this.repository.findOne({
      where: { recommendationId },
    });
  }

  /**
   * 결과 저장
   */
  async save(result: Partial<Result>): Promise<Result> {
    const entity = this.repository.create(result);
    return this.repository.save(entity);
  }

  /**
   * 결과 존재 여부 확인
   */
  async exists(recommendationId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { recommendationId },
    });
    return count > 0;
  }
}
