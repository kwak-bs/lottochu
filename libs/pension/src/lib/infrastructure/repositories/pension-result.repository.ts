import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PensionResult } from '../../domain/entities';

@Injectable()
export class PensionResultRepository {
  constructor(
    @InjectRepository(PensionResult)
    private readonly repository: Repository<PensionResult>,
  ) {}

  async findByRecommendationId(
    recommendationId: string,
  ): Promise<PensionResult | null> {
    return this.repository.findOne({
      where: { recommendationId },
    });
  }

  async save(result: Partial<PensionResult>): Promise<PensionResult> {
    return this.repository.save(result);
  }

  async exists(recommendationId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { recommendationId },
    });
    return count > 0;
  }
}
