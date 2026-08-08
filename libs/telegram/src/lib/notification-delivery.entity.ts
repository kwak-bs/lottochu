import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NotificationEventType {
  LOTTO_RECOMMENDATION = 'LOTTO_RECOMMENDATION',
  LOTTO_RESULT = 'LOTTO_RESULT',
  PENSION_RECOMMENDATION = 'PENSION_RECOMMENDATION',
  PENSION_RESULT = 'PENSION_RESULT',
}

export enum NotificationDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Entity('notification_deliveries')
@Index(
  'UQ_notification_delivery_event_draw_channel',
  ['eventType', 'drawId', 'channel'],
  { unique: true },
)
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, name: 'event_type' })
  eventType: NotificationEventType;

  @Column({ type: 'int', name: 'draw_id' })
  drawId: number;

  @Column({ type: 'varchar', length: 20, default: 'telegram' })
  channel: string;

  @Column({ type: 'varchar', length: 20 })
  status: NotificationDeliveryStatus;

  @Column({ type: 'int', default: 1 })
  attempts: number;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string | null;

  @Column({ type: 'timestamptz', name: 'attempted_at' })
  attemptedAt: Date;

  @Column({ type: 'timestamptz', name: 'sent_at', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
