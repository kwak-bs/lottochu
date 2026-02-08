import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DhLotteryClient } from './clients/dhlottery.client';
import { DhPensionClient } from './clients/dh-pension.client';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [DhLotteryClient, DhPensionClient],
  exports: [HttpModule, DhLotteryClient, DhPensionClient],
})
export class SharedModule {}
