import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateDashboardLoginsTable1558804433320 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "dashboard_logins",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            collation: "ascii_bin",
          },
          {
            name: "token",
            type: "varchar",
            length: "64",
            collation: "ascii_bin",
          },
          {
            name: "user_id",
            type: "bigint",
          },
          {
            name: "user_data",
            type: "text",
          },
          {
            name: "logged_in_at",
            type: "DATETIME",
          },
          {
            name: "expires_at",
            type: "DATETIME",
          },
        ],
        indices: [
          {
            columnNames: ["user_id"],
          },
          {
            columnNames: ["expires_at"],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("dashboard_logins", true);
  }
}
