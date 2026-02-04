import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Recommendation } from './recommendation.entity';

/**
 * 추천 번호 결과 엔티티
 * 추천 번호와 실제 당첨 번호를 비교한 결과
 */
@Entity('results')
export class Result {
  /** 고유 ID (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 추천 ID (FK) */
  @Column({ type: 'uuid', name: 'recommendation_id' })
  recommendationId: string;

  /** 일치한 번호 개수 (0~6) */
  @Column({ type: 'int', name: 'matched_count' })
  matchedCount: number;

  /** 일치한 번호들 */
  @Column({ type: 'int', array: true, name: 'matched_numbers' })
  matchedNumbers: number[];

  /** 보너스 번호 일치 여부 */
  @Column({ type: 'boolean', name: 'has_bonus', default: false })
  hasBonus: boolean;

  /** 당첨 등수 (null이면 낙첨) */
  @Column({ type: 'int', name: 'prize_rank', nullable: true })
  prizeRank: number | null;

  /** 생성 시간 */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** 추천 관계 */
  @OneToOne(() => Recommendation, (recommendation) => recommendation.result)
  @JoinColumn({ name: 'recommendation_id' })
  recommendation: Recommendation;
}
