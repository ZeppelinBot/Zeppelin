import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateDashboardUsersTable1558804449510 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "dashboard_users",
        columns: [
          {
            name: "guild_id",
            type: "bigint",
          },
          {
            name: "user_id",
            type: "bigint",
          },
          {
            name: "username",
            type: "varchar",
            length: "255",
          },
          {
            name: "role",
            type: "varchar",
            length: "32",
          },
        ],
      }),
    );

    await queryRunner.createPrimaryKey("dashboard_users", ["guild_id", "user_id"]);
    await queryRunner.createIndex(
      "dashboard_users",
      new TableIndex({
        columnNames: ["user_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("dashboard_users", true);
  }
}
