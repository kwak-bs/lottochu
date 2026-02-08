import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { PensionResult } from './pension-result.entity';

/**
 * 연금복권 추천 타입 enum
 */
export enum PensionRecommendationType {
  STATISTICAL = 'STATISTICAL',
  AI = 'AI',
}

/**
 * 연금복권720+ 추천 엔티티
 * 조(1~5) + 6자리 번호
 */
@Entity('pension_recommendations')
export class PensionRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 대상 회차 */
  @Column({ type: 'int', name: 'target_draw_id' })
  targetDrawId: number;

  @Column({
    type: 'enum',
    enum: PensionRecommendationType,
  })
  type: PensionRecommendationType;

  @Column({ type: 'int', name: 'game_number' })
  gameNumber: number;

  /** 조 번호 (1~5) */
  @Column({ type: 'int', name: 'group_no' })
  groupNo: number;

  /** 6자리 번호 (예: 112703) */
  @Column({ type: 'varchar', length: 6 })
  digits: string;

  @Column({ type: 'text', name: 'ai_reasoning', nullable: true })
  aiReasoning: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => PensionResult, (result) => result.recommendation)
  result: PensionResult;
}
