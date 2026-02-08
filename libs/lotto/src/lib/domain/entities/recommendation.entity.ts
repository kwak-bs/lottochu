import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { Result } from './result.entity';

/**
 * 추천 타입 enum
 */
export enum RecommendationType {
  /** 통계 기반 추천 (하위 20개 번호 제외) */
  STATISTICAL = 'STATISTICAL',
  /** AI 기반 추천 (Ollama) */
  AI = 'AI',
}

/**
 * 로또 번호 추천 엔티티
 */
@Entity('lotto_recommendations')
export class Recommendation {
  /** 고유 ID (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 대상 회차 (FK) */
  @Column({ type: 'int', name: 'target_draw_id' })
  targetDrawId: number;

  /** 추천 타입 */
  @Column({
    type: 'enum',
    enum: RecommendationType,
  })
  type: RecommendationType;

  /** 게임 번호 (1~5) */
  @Column({ type: 'int', name: 'game_number' })
  gameNumber: number;

  /** 추천 번호 6개 */
  @Column({ type: 'int', array: true })
  numbers: number[];

  /** AI 추천 근거 (AI 타입일 때만) */
  @Column({ type: 'text', name: 'ai_reasoning', nullable: true })
  aiReasoning: string | null;

  /** 생성 시간 */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** 결과 관계 */
  @OneToOne(() => Result, (result) => result.recommendation)
  result: Result;
}
