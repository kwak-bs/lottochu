import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPensionBonusDigits1786131000000 implements MigrationInterface {
  name = 'AddPensionBonusDigits1786131000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pension_draws
      ADD COLUMN bonus_digits varchar(6) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pension_draws
      DROP COLUMN bonus_digits
    `);
  }
}
