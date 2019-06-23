import { MigrationInterface, QueryRunner } from "typeorm";

export class DropUserDataFromLoginsAndPermissions1561283405201 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query("ALTER TABLE `api_logins` DROP COLUMN `user_data`");
    await queryRunner.query("ALTER TABLE `api_permissions` DROP COLUMN `username`");
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      "ALTER TABLE `api_logins` ADD COLUMN `user_data` TEXT NOT NULL COLLATE 'utf8mb4_swedish_ci' AFTER `user_id`",
    );
    await queryRunner.query(
      "ALTER TABLE `api_permissions` ADD COLUMN `username` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_swedish_ci' AFTER `user_id`",
    );
  }
}
