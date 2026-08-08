import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecommendationAndNotificationIdempotency1786130000000
  implements MigrationInterface
{
  name = 'AddRecommendationAndNotificationIdempotency1786130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TEMP TABLE lotto_recommendation_duplicates_to_remove AS
      SELECT id
      FROM (
        SELECT
          recommendation.id,
          ROW_NUMBER() OVER (
            PARTITION BY recommendation.target_draw_id, recommendation.game_number
            ORDER BY
              EXISTS (
                SELECT 1 FROM lotto_results result
                WHERE result.recommendation_id = recommendation.id
              ) DESC,
              recommendation.created_at ASC,
              recommendation.id ASC
          ) AS row_number
        FROM lotto_recommendations recommendation
      ) ranked
      WHERE row_number > 1
    `);
    await queryRunner.query(`
      DELETE FROM lotto_results
      WHERE recommendation_id IN (
        SELECT id FROM lotto_recommendation_duplicates_to_remove
      )
    `);
    await queryRunner.query(`
      DELETE FROM lotto_recommendations
      WHERE id IN (
        SELECT id FROM lotto_recommendation_duplicates_to_remove
      )
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE pension_recommendation_duplicates_to_remove AS
      SELECT id
      FROM (
        SELECT
          recommendation.id,
          ROW_NUMBER() OVER (
            PARTITION BY recommendation.target_draw_id, recommendation.game_number
            ORDER BY
              EXISTS (
                SELECT 1 FROM pension_results result
                WHERE result.recommendation_id = recommendation.id
              ) DESC,
              recommendation.created_at ASC,
              recommendation.id ASC
          ) AS row_number
        FROM pension_recommendations recommendation
      ) ranked
      WHERE row_number > 1
    `);
    await queryRunner.query(`
      DELETE FROM pension_results
      WHERE recommendation_id IN (
        SELECT id FROM pension_recommendation_duplicates_to_remove
      )
    `);
    await queryRunner.query(`
      DELETE FROM pension_recommendations
      WHERE id IN (
        SELECT id FROM pension_recommendation_duplicates_to_remove
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_lotto_recommendation_draw_game"
      ON lotto_recommendations (target_draw_id, game_number)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_pension_recommendation_draw_game"
      ON pension_recommendations (target_draw_id, game_number)
    `);
    await queryRunner.query(`
      CREATE TABLE notification_deliveries (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_type varchar(40) NOT NULL,
        draw_id integer NOT NULL,
        channel varchar(20) NOT NULL DEFAULT 'telegram',
        status varchar(20) NOT NULL,
        attempts integer NOT NULL DEFAULT 1,
        last_error text NULL,
        attempted_at timestamptz NOT NULL,
        sent_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_notification_delivery_event_draw_channel"
          UNIQUE (event_type, draw_id, channel)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE notification_deliveries');
    await queryRunner.query('DROP INDEX "UQ_pension_recommendation_draw_game"');
    await queryRunner.query('DROP INDEX "UQ_lotto_recommendation_draw_game"');
  }
}
