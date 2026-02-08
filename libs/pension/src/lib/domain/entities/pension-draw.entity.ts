import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * 연금복권720+ 추첨 결과 엔티티
 * 동행복권 pt720 API에서 가져온 회차별 당첨 정보 저장
 */
@Entity('pension_draws')
export class PensionDraw {
  /** 회차 번호 (PK) */
  @PrimaryColumn({ type: 'int' })
  id: number;

  /** 추첨일 */
  @Column({ type: 'date', name: 'draw_date', nullable: true })
  drawDate: Date | null;

  /** 1등 조 번호 (1~5), API 미제공 시 nullable */
  @Column({ type: 'int', name: 'group_no', nullable: true })
  groupNo: number | null;

  /** 1등 6자리 번호 (예: 112703), API 미제공 시 nullable */
  @Column({ type: 'varchar', length: 6, nullable: true })
  digits: string | null;

  /** 1~8등 당첨금 (API wnRnk 1~8) */
  @Column({ type: 'bigint', name: 'prize_1st', nullable: true })
  prize1st: string | null;
  @Column({ type: 'bigint', name: 'prize_2nd', nullable: true })
  prize2nd: string | null;
  @Column({ type: 'bigint', name: 'prize_3rd', nullable: true })
  prize3rd: string | null;
  @Column({ type: 'bigint', name: 'prize_4th', nullable: true })
  prize4th: string | null;
  @Column({ type: 'bigint', name: 'prize_5th', nullable: true })
  prize5th: string | null;
  @Column({ type: 'bigint', name: 'prize_6th', nullable: true })
  prize6th: string | null;
  @Column({ type: 'bigint', name: 'prize_7th', nullable: true })
  prize7th: string | null;
  @Column({ type: 'bigint', name: 'prize_8th', nullable: true })
  prize8th: string | null;

  /** 1~8등 당첨자 수 */
  @Column({ type: 'int', name: 'winners_1st', nullable: true })
  winners1st: number | null;
  @Column({ type: 'int', name: 'winners_2nd', nullable: true })
  winners2nd: number | null;
  @Column({ type: 'int', name: 'winners_3rd', nullable: true })
  winners3rd: number | null;
  @Column({ type: 'int', name: 'winners_4th', nullable: true })
  winners4th: number | null;
  @Column({ type: 'int', name: 'winners_5th', nullable: true })
  winners5th: number | null;
  @Column({ type: 'int', name: 'winners_6th', nullable: true })
  winners6th: number | null;
  @Column({ type: 'int', name: 'winners_7th', nullable: true })
  winners7th: number | null;
  @Column({ type: 'int', name: 'winners_8th', nullable: true })
  winners8th: number | null;

  /** 데이터 수집 시간 */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
