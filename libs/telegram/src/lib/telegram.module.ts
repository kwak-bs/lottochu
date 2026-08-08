import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationDelivery } from './notification-delivery.entity';
import { NotificationDeliveryRepository } from './notification-delivery.repository';
import { TelegramService } from './telegram.service';
import { PurchaseConfirmation } from './purchase-confirmation.entity';
import { PurchaseConfirmationRepository } from './purchase-confirmation.repository';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationDelivery, PurchaseConfirmation])],
  providers: [
    TelegramService,
    NotificationDeliveryRepository,
    PurchaseConfirmationRepository,
  ],
  exports: [TelegramService, PurchaseConfirmationRepository],
})
export class TelegramModule {}
