import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameBackendDashboardStuffToAPI1561282151982 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE dashboard_users RENAME api_users`);
    await queryRunner.query(`ALTER TABLE dashboard_logins RENAME api_logins`);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE api_users RENAME dashboard_users`);
    await queryRunner.query(`ALTER TABLE api_logins RENAME dashboard_logins`);
  }
}
