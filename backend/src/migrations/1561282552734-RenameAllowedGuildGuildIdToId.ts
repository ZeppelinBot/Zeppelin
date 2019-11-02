import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameAllowedGuildGuildIdToId1561282552734 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query("ALTER TABLE `allowed_guilds` CHANGE COLUMN `guild_id` `id` BIGINT(20) NOT NULL FIRST;");
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query("ALTER TABLE `allowed_guilds` CHANGE COLUMN `id` `guild_id` BIGINT(20) NOT NULL FIRST;");
  }
}
