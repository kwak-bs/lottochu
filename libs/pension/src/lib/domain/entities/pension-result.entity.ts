import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { PensionRecommendation } from './pension-recommendation.entity';

/**
 * 연금복권 추천 결과 엔티티
 * 1~8등 또는 낙첨
 */
@Entity('pension_results')
export class PensionResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'recommendation_id' })
  recommendationId: string;

  /** 당첨 등수 (1~8), null이면 낙첨 */
  @Column({ type: 'int', name: 'prize_rank', nullable: true })
  prizeRank: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => PensionRecommendation, (rec) => rec.result)
  @JoinColumn({ name: 'recommendation_id' })
  recommendation: PensionRecommendation;
}
