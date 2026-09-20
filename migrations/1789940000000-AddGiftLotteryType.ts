import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGiftLotteryType1789940000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."lotto_recommendations_type_enum" ADD VALUE IF NOT EXISTS 'GIFT'`,
    );
  }

  public async down(): Promise<void> {
    throw new Error(
      'GIFT enum removal requires a data-preserving manual migration',
    );
  }
}
