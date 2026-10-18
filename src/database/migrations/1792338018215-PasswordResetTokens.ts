import { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordResetTokens1792338018215 implements MigrationInterface {
  name = 'PasswordResetTokens1792338018215';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`password_reset_tokens\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`user_id\` int UNSIGNED NOT NULL,
        \`token_hash\` char(64) NOT NULL,
        \`expires_at\` datetime NOT NULL,
        \`used_at\` datetime NULL,
        INDEX \`IDX_password_reset_tokens_user_id\` (\`user_id\`),
        UNIQUE INDEX \`UQ_password_reset_tokens_token_hash\` (\`token_hash\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`password_reset_tokens\`
        ADD CONSTRAINT \`FK_password_reset_tokens_user_id\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `password_reset_tokens` DROP FOREIGN KEY `FK_password_reset_tokens_user_id`',
    );
    await queryRunner.query('DROP TABLE `password_reset_tokens`');
  }
}
