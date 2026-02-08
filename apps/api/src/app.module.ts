import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig, appConfig } from '@lottochu/shared';
import { LottoModule } from '@lottochu/lotto';
import { PensionModule } from '@lottochu/pension';
import { StatisticsModule } from '@lottochu/statistics';
import { TelegramModule } from '@lottochu/telegram';
import { SchedulerModule } from '@lottochu/scheduler';

@Module({
  imports: [
    // 환경변수 설정
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env'],
    }),

    // TypeORM 데이터베이스 연결
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        database: configService.get('database.database'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        autoLoadEntities: true,
        synchronize: configService.get('app.nodeEnv') === 'development', // 개발 환경에서만 true
        logging: configService.get('app.nodeEnv') === 'development',
      }),
    }),

    // Feature Modules
    LottoModule,
    PensionModule,
    StatisticsModule,
    TelegramModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
