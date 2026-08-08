import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Draw } from './libs/lotto/src/lib/domain/entities/draw.entity';
import { Recommendation } from './libs/lotto/src/lib/domain/entities/recommendation.entity';
import { Result } from './libs/lotto/src/lib/domain/entities/result.entity';
import { PensionDraw } from './libs/pension/src/lib/domain/entities/pension-draw.entity';
import { PensionRecommendation } from './libs/pension/src/lib/domain/entities/pension-recommendation.entity';
import { PensionResult } from './libs/pension/src/lib/domain/entities/pension-result.entity';
import { NotificationDelivery } from './libs/telegram/src/lib/notification-delivery.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT || 5432),
  database: process.env.DATABASE_NAME || 'lottochu',
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  entities: [
    Draw,
    Recommendation,
    Result,
    PensionDraw,
    PensionRecommendation,
    PensionResult,
    NotificationDelivery,
  ],
  migrations: ['migrations/*{.ts,.js}'],
  synchronize: false,
});
