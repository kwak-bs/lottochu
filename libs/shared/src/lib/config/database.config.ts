import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const password = process.env.DATABASE_PASSWORD;
  if (!password && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_PASSWORD is required in production');
  }
  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'lottochu',
    username: process.env.DATABASE_USER || 'postgres',
    password: password || '',
  };
});
