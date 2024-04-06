import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateSlowmodeTables1544877081073 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "slowmode_channels",
        columns: [
          {
            name: "guild_id",
            type: "bigint",
            unsigned: true,
            isPrimary: true,
          },
          {
            name: "channel_id",
            type: "bigint",
            unsigned: true,
            isPrimary: true,
          },
          {
            name: "slowmode_seconds",
            type: "int",
            unsigned: true,
          },
        ],
        indices: [],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "slowmode_users",
        columns: [
          {
            name: "guild_id",
            type: "bigint",
            unsigned: true,
            isPrimary: true,
          },
          {
            name: "channel_id",
            type: "bigint",
            unsigned: true,
            isPrimary: true,
          },
          {
            name: "user_id",
            type: "bigint",
            unsigned: true,
            isPrimary: true,
          },
          {
            name: "expires_at",
            type: "datetime",
          },
        ],
        indices: [
          {
            columnNames: ["expires_at"],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await Promise.all([
      queryRunner.dropTable("slowmode_channels", true),
      queryRunner.dropTable("slowmode_users", true),
    ]);
  }
}
