import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationDelivery,
  NotificationDeliveryStatus,
  NotificationEventType,
} from './notification-delivery.entity';

@Injectable()
export class NotificationDeliveryRepository {
  constructor(
    @InjectRepository(NotificationDelivery)
    private readonly repository: Repository<NotificationDelivery>,
  ) {}

  async claim(
    eventType: NotificationEventType,
    drawId: number,
  ): Promise<boolean> {
    const claimed = await this.repository.query<{ id: string }[]>(
      `
        INSERT INTO notification_deliveries (
          id, event_type, draw_id, channel, status, attempts,
          last_error, attempted_at, sent_at, created_at, updated_at
        )
        VALUES (uuid_generate_v4(), $1, $2, 'telegram', $3, 1, NULL, NOW(), NULL, NOW(), NOW())
        ON CONFLICT (event_type, draw_id, channel)
        DO UPDATE SET
          status = $3,
          attempts = notification_deliveries.attempts + 1,
          last_error = NULL,
          attempted_at = NOW(),
          updated_at = NOW()
        WHERE notification_deliveries.status = $4
           OR (
             notification_deliveries.status = $3
             AND notification_deliveries.attempted_at < NOW() - INTERVAL '10 minutes'
           )
        RETURNING id
      `,
      [
        eventType,
        drawId,
        NotificationDeliveryStatus.PENDING,
        NotificationDeliveryStatus.FAILED,
      ],
    );

    return claimed.length > 0;
  }

  async markSent(
    eventType: NotificationEventType,
    drawId: number,
  ): Promise<void> {
    await this.repository.update(
      { eventType, drawId, channel: 'telegram' },
      {
        status: NotificationDeliveryStatus.SENT,
        sentAt: new Date(),
        lastError: null,
      },
    );
  }

  async markFailed(
    eventType: NotificationEventType,
    drawId: number,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    await this.repository.update(
      { eventType, drawId, channel: 'telegram' },
      {
        status: NotificationDeliveryStatus.FAILED,
        lastError: message.slice(0, 4000),
      },
    );
  }
}
