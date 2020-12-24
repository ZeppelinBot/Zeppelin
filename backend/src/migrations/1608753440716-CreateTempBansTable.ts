import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateTempBansTable1608753440716 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "tempbans",
        columns: [
          {
            name: "guild_id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "user_id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "mod_id",
            type: "bigint",
          },
          {
            name: "created_at",
            type: "datetime",
          },
          {
            name: "expires_at",
            type: "datetime",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("tempbans");
  }
}
