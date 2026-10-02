import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResetTokens1791000000000 implements MigrationInterface {
  name = 'CreatePasswordResetTokens1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`password_reset_tokens\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`user_id\` int UNSIGNED NOT NULL,
        \`token_hash\` varchar(64) NOT NULL,
        \`expires_at\` datetime NOT NULL,
        \`used_at\` datetime NULL,
        UNIQUE INDEX \`UQ_password_reset_tokens_token_hash\` (\`token_hash\`),
        INDEX \`IDX_password_reset_tokens_user_id\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_password_reset_tokens_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `password_reset_tokens`');
  }
}
