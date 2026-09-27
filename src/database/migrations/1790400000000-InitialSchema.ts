import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1790400000000 implements MigrationInterface {
  name = 'InitialSchema1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`name\` varchar(120) NOT NULL,
        \`email\` varchar(180) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`role\` varchar(30) NOT NULL DEFAULT 'USER',
        \`active\` tinyint NOT NULL DEFAULT 1,
        \`token_version\` int UNSIGNED NOT NULL DEFAULT 0,
        UNIQUE INDEX \`UQ_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`products\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`name\` varchar(150) NOT NULL,
        \`code\` varchar(50) NOT NULL,
        \`description\` text NULL,
        \`unit\` varchar(20) NOT NULL,
        \`active\` tinyint NOT NULL DEFAULT 1,
        UNIQUE INDEX \`UQ_products_code\` (\`code\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`quotations\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`date\` date NOT NULL,
        \`source\` varchar(30) NOT NULL DEFAULT 'MANUAL',
        \`commodity\` varchar(60) NOT NULL,
        \`value\` decimal(18,4) NOT NULL,
        \`currency\` char(3) NOT NULL,
        \`unit\` varchar(20) NOT NULL,
        INDEX \`IDX_quotations_commodity_date\` (\`commodity\`, \`date\`),
        UNIQUE INDEX \`UQ_quotations_date_source_commodity\` (\`date\`, \`source\`, \`commodity\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`pricing_formulas\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`name\` varchar(120) NOT NULL,
        \`description\` text NULL,
        \`active\` tinyint NOT NULL DEFAULT 1,
        UNIQUE INDEX \`UQ_pricing_formulas_name\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `pricing_formulas`');
    await queryRunner.query('DROP TABLE `quotations`');
    await queryRunner.query('DROP TABLE `products`');
    await queryRunner.query('DROP TABLE `users`');
  }
}
