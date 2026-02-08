import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PensionDraw } from '../../domain/entities';

@Injectable()
export class PensionDrawRepository {
  constructor(
    @InjectRepository(PensionDraw)
    private readonly repository: Repository<PensionDraw>,
  ) {}

  async findById(id: number): Promise<PensionDraw | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findLatest(): Promise<PensionDraw | null> {
    const results = await this.repository.find({
      order: { id: 'DESC' },
      take: 1,
    });
    return results[0] || null;
  }

  async findAll(): Promise<PensionDraw[]> {
    return this.repository.find({ order: { id: 'ASC' } });
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  async save(draw: Partial<PensionDraw>): Promise<PensionDraw> {
    return this.repository.save(draw);
  }

  async saveMany(draws: Partial<PensionDraw>[]): Promise<PensionDraw[]> {
    return this.repository.save(draws);
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }
}
