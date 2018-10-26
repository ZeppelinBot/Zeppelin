import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePreTypeORMTables1540519249973 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`archives\` (
          \`id\`         VARCHAR(36) NOT NULL,
          \`guild_id\`   VARCHAR(20) NOT NULL,
          \`body\`       MEDIUMTEXT  NOT NULL,
          \`created_at\` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`expires_at\` DATETIME    NULL     DEFAULT NULL,
          PRIMARY KEY (\`id\`)
        )
          COLLATE='utf8mb4_general_ci'
      `);

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`cases\` (
          \`id\`           INT(10) UNSIGNED    NOT NULL AUTO_INCREMENT,
          \`guild_id\`     BIGINT(20) UNSIGNED NOT NULL,
          \`case_number\`  INT(10) UNSIGNED    NOT NULL,
          \`user_id\`      BIGINT(20) UNSIGNED NOT NULL,
          \`user_name\`    VARCHAR(128)        NOT NULL,
          \`mod_id\`       BIGINT(20) UNSIGNED NULL     DEFAULT NULL,
          \`mod_name\`     VARCHAR(128)        NULL     DEFAULT NULL,
          \`type\`         INT(10) UNSIGNED    NOT NULL,
          \`audit_log_id\` BIGINT(20)          NULL     DEFAULT NULL,
          \`created_at\`   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`mod_actions_guild_id_case_number_unique\` (\`guild_id\`, \`case_number\`),
          UNIQUE INDEX \`mod_actions_audit_log_id_unique\` (\`audit_log_id\`),
          INDEX \`mod_actions_user_id_index\` (\`user_id\`),
          INDEX \`mod_actions_mod_id_index\` (\`mod_id\`),
          INDEX \`mod_actions_created_at_index\` (\`created_at\`)
        )
          COLLATE = 'utf8mb4_general_ci'
      `);

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`case_notes\` (
          \`id\`         INT(10) UNSIGNED    NOT NULL AUTO_INCREMENT,
          \`case_id\`    INT(10) UNSIGNED    NOT NULL,
          \`mod_id\`     BIGINT(20) UNSIGNED NULL     DEFAULT NULL,
          \`mod_name\`   VARCHAR(128)        NULL     DEFAULT NULL,
          \`body\`       TEXT                NOT NULL,
          \`created_at\` DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          INDEX \`mod_action_notes_mod_action_id_index\` (\`case_id\`),
          INDEX \`mod_action_notes_mod_id_index\` (\`mod_id\`),
          INDEX \`mod_action_notes_created_at_index\` (\`created_at\`)
        )
          COLLATE = 'utf8mb4_general_ci'
      `);

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`mutes\` (
          \`guild_id\`   BIGINT(20) UNSIGNED NOT NULL,
          \`user_id\`    BIGINT(20) UNSIGNED NOT NULL,
          \`created_at\` DATETIME            NULL DEFAULT CURRENT_TIMESTAMP,
          \`expires_at\` DATETIME            NULL DEFAULT NULL,
          \`case_id\`    INT(10) UNSIGNED    NULL DEFAULT NULL,
          PRIMARY KEY (\`guild_id\`, \`user_id\`),
          INDEX \`mutes_expires_at_index\` (\`expires_at\`),
          INDEX \`mutes_case_id_foreign\` (\`case_id\`),
          CONSTRAINT \`mutes_case_id_foreign\` FOREIGN KEY (\`case_id\`) REFERENCES \`cases\` (\`id\`)
            ON DELETE SET NULL
        )
          COLLATE = 'utf8mb4_general_ci'
      `);

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`persisted_data\` (
          \`guild_id\`       VARCHAR(20)   NOT NULL,
          \`user_id\`        VARCHAR(20)   NOT NULL,
          \`roles\`          VARCHAR(1024) NULL     DEFAULT NULL,
          \`nickname\`       VARCHAR(255)  NULL     DEFAULT NULL,
          \`is_voice_muted\` INT(11)       NOT NULL DEFAULT '0',
          PRIMARY KEY (\`guild_id\`, \`user_id\`)
        )
          COLLATE = 'utf8mb4_general_ci'
      `);

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`reaction_roles\` (
          \`guild_id\`   VARCHAR(20) NOT NULL,
          \`channel_id\` VARCHAR(20) NOT NULL,
          \`message_id\` VARCHAR(20) NOT NULL,
          \`emoji\`      VARCHAR(20) NOT NULL,
          \`role_id\`    VARCHAR(20) NOT NULL,
          PRIMARY KEY (\`guild_id\`, \`channel_id\`, \`message_id\`, \`emoji\`),
          INDEX \`reaction_roles_message_id_emoji_index\` (\`message_id\`, \`emoji\`)
        )
          COLLATE = 'utf8mb4_general_ci'
      `);

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`tags\` (
          \`guild_id\`   BIGINT(20) UNSIGNED NOT NULL,
          \`tag\`        VARCHAR(64)         NOT NULL,
          \`user_id\`    BIGINT(20) UNSIGNED NOT NULL,
          \`body\`       TEXT                NOT NULL,
          \`created_at\` DATETIME            NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`guild_id\`, \`tag\`)
        )
          COLLATE = 'utf8mb4_general_ci'
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    // No down function since we're migrating (hehe) from another migration system (knex)
  }
}
