import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseConfirmations1786132000000
  implements MigrationInterface
{
  name = 'AddPurchaseConfirmations1786132000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE purchase_confirmations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        lottery_type varchar(20) NOT NULL,
        draw_id integer NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        expected_amount integer NOT NULL DEFAULT 5000,
        recommendation_summary text NOT NULL,
        telegram_message_id bigint NULL,
        reminder_count integer NOT NULL DEFAULT 0,
        last_reminded_at timestamptz NULL,
        confirmed_at timestamptz NULL,
        skipped_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_purchase_confirmation_type_draw"
          UNIQUE (lottery_type, draw_id)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE purchase_confirmations');
  }
}
