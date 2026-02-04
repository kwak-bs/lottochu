import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DhLotteryClient } from './clients/dhlottery.client';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [DhLotteryClient],
  exports: [HttpModule, DhLotteryClient],
})
export class SharedModule {}
