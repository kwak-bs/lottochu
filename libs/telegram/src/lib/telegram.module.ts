import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationDelivery } from './notification-delivery.entity';
import { NotificationDeliveryRepository } from './notification-delivery.repository';
import { TelegramService } from './telegram.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationDelivery])],
  providers: [TelegramService, NotificationDeliveryRepository],
  exports: [TelegramService],
})
export class TelegramModule {}
