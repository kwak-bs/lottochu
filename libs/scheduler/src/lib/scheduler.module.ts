import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CqrsModule } from '@nestjs/cqrs';
import { SchedulerService } from './scheduler.service';
import { LottoModule } from '@lottochu/lotto';
import { TelegramModule } from '@lottochu/telegram';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CqrsModule,
    LottoModule,
    TelegramModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
