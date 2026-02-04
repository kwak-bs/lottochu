import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recommendation } from '../../domain/entities';

@Injectable()
export class RecommendationRepository {
  constructor(
    @InjectRepository(Recommendation)
    private readonly repository: Repository<Recommendation>,
  ) {}

  /**
   * 특정 회차의 추천 번호 조회
   */
  async findByDrawId(drawId: number): Promise<Recommendation[]> {
    return this.repository.find({
      where: { targetDrawId: drawId },
      order: { gameNumber: 'ASC' },
    });
  }

  /**
   * 추천 저장
   */
  async save(recommendation: Partial<Recommendation>): Promise<Recommendation> {
    const entity = this.repository.create(recommendation);
    return this.repository.save(entity);
  }

  /**
   * 여러 추천 저장
   */
  async saveMany(recommendations: Partial<Recommendation>[]): Promise<Recommendation[]> {
    const entities = recommendations.map((r) => this.repository.create(r));
    return this.repository.save(entities);
  }
}
