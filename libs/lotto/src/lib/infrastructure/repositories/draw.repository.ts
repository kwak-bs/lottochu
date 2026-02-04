import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draw } from '../../domain/entities';

@Injectable()
export class DrawRepository {
  constructor(
    @InjectRepository(Draw)
    private readonly repository: Repository<Draw>,
  ) {}

  /**
   * 회차로 조회
   */
  async findById(id: number): Promise<Draw | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * 최신 회차 조회
   */
  async findLatest(): Promise<Draw | null> {
    const results = await this.repository.find({
      order: { id: 'DESC' },
      take: 1,
    });
    return results[0] || null;
  }

  /**
   * 모든 회차 조회
   */
  async findAll(): Promise<Draw[]> {
    return this.repository.find({
      order: { id: 'ASC' },
    });
  }

  /**
   * 범위로 조회
   */
  async findByRange(startId: number, endId: number): Promise<Draw[]> {
    return this.repository
      .createQueryBuilder('draw')
      .where('draw.id >= :startId', { startId })
      .andWhere('draw.id <= :endId', { endId })
      .orderBy('draw.id', 'ASC')
      .getMany();
  }

  /**
   * 저장된 회차 수
   */
  async count(): Promise<number> {
    return this.repository.count();
  }

  /**
   * 저장
   */
  async save(draw: Partial<Draw>): Promise<Draw> {
    return this.repository.save(draw);
  }

  /**
   * 여러 개 저장
   */
  async saveMany(draws: Partial<Draw>[]): Promise<Draw[]> {
    return this.repository.save(draws);
  }

  /**
   * 존재 여부 확인
   */
  async exists(id: number): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }
}
