import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * 로또 추첨 결과 엔티티
 * 동행복권에서 가져온 역대 당첨 번호를 저장
 */
@Entity('lotto_draws')
export class Draw {
  /** 회차 번호 (PK) */
  @PrimaryColumn({ type: 'int' })
  id: number;

  /** 추첨일 */
  @Column({ type: 'date', name: 'draw_date' })
  drawDate: Date;

  /** 당첨 번호 (1~6번째) */
  @Column({ type: 'int', array: true })
  numbers: number[];

  /** 보너스 번호 */
  @Column({ type: 'int', name: 'bonus_number' })
  bonusNumber: number;

  /** 1등 당첨금 */
  @Column({ type: 'bigint', name: 'prize_1st', nullable: true })
  prize1st: string | null;

  /** 1등 당첨자 수 */
  @Column({ type: 'int', name: 'winners_1st', nullable: true })
  winners1st: number | null;

  /** 2등 당첨금 */
  @Column({ type: 'bigint', name: 'prize_2nd', nullable: true })
  prize2nd: string | null;

  /** 2등 당첨자 수 */
  @Column({ type: 'int', name: 'winners_2nd', nullable: true })
  winners2nd: number | null;

  /** 3등 당첨금 */
  @Column({ type: 'bigint', name: 'prize_3rd', nullable: true })
  prize3rd: string | null;

  /** 3등 당첨자 수 */
  @Column({ type: 'int', name: 'winners_3rd', nullable: true })
  winners3rd: number | null;

  /** 데이터 수집 시간 */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
