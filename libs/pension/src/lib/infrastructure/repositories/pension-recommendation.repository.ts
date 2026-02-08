import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PensionRecommendation } from '../../domain/entities';

@Injectable()
export class PensionRecommendationRepository {
  constructor(
    @InjectRepository(PensionRecommendation)
    private readonly repository: Repository<PensionRecommendation>,
  ) {}

  async findByDrawId(drawId: number): Promise<PensionRecommendation[]> {
    return this.repository.find({
      where: { targetDrawId: drawId },
      order: { gameNumber: 'ASC' },
    });
  }

  async save(rec: Partial<PensionRecommendation>): Promise<PensionRecommendation> {
    return this.repository.save(rec);
  }

  async saveMany(
    recs: Partial<PensionRecommendation>[],
  ): Promise<PensionRecommendation[]> {
    return this.repository.save(recs);
  }
}
