import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameApiUsersToApiPermissions1561283165823 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE api_users RENAME api_permissions`);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE api_permissions RENAME api_users`);
  }
}
