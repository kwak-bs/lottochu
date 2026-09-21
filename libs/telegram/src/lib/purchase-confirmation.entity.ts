import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LotteryType {
  LOTTO = 'LOTTO',
  PENSION = 'PENSION',
}

export enum PurchaseStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SKIPPED = 'SKIPPED',
}

@Entity('purchase_confirmations')
@Index('UQ_purchase_confirmation_type_draw', ['lotteryType', 'drawId'], {
  unique: true,
})
export class PurchaseConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, name: 'lottery_type' })
  lotteryType: LotteryType;

  @Column({ type: 'int', name: 'draw_id' })
  drawId: number;

  @Column({ type: 'varchar', length: 20, default: PurchaseStatus.PENDING })
  status: PurchaseStatus;

  @Column({ type: 'int', name: 'expected_amount', default: 5000 })
  expectedAmount: number;

  @Column({ type: 'text', name: 'recommendation_summary' })
  recommendationSummary: string;

  @Column({ type: 'bigint', name: 'telegram_message_id', nullable: true })
  telegramMessageId: string | null;

  @Column({ type: 'int', name: 'reminder_count', default: 0 })
  reminderCount: number;

  @Column({ type: 'timestamptz', name: 'last_reminded_at', nullable: true })
  lastRemindedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'confirmed_at', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'skipped_at', nullable: true })
  skippedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
