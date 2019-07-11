import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class AddVCAlertTable1561391921385 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "vc_alerts",
        columns: [
          {
            name: "id",
            type: "int",
            unsigned: true,
            isGenerated: true,
            generationStrategy: "increment",
            isPrimary: true,
          },
          {
            name: "guild_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "requestor_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "user_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "channel_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "expires_at",
            type: "datetime",
          },
          {
            name: "body",
            type: "text",
          },
        ],
        indices: [
          {
            columnNames: ["guild_id", "user_id"],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("vc_alerts", true, false, true);
  }
}
