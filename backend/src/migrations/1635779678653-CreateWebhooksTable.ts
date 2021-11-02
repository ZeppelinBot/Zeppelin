import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateWebhooksTable1635779678653 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "webhooks",
        columns: [
          {
            name: "id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "guild_id",
            type: "bigint",
          },
          {
            name: "channel_id",
            type: "bigint",
          },
          {
            name: "token",
            type: "text",
          },
          {
            name: "created_at",
            type: "datetime",
            default: "(NOW())",
          },
        ],
        indices: [
          {
            columnNames: ["channel_id"],
            isUnique: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("webhooks");
  }
}
