import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateMessagesTable1543053430712 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "messages",
        columns: [
          {
            name: "id",
            type: "bigint",
            unsigned: true,
            isPrimary: true,
          },
          {
            name: "guild_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "channel_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "user_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "is_bot",
            type: "tinyint",
            unsigned: true,
          },
          {
            name: "data",
            type: "mediumtext",
          },
          {
            name: "posted_at",
            type: "datetime(3)",
          },
          {
            name: "deleted_at",
            type: "datetime(3)",
            isNullable: true,
            default: null,
          },
          {
            name: "is_permanent",
            type: "tinyint",
            unsigned: true,
            default: 0,
          },
        ],
        indices: [
          { columnNames: ["guild_id"] },
          { columnNames: ["channel_id"] },
          { columnNames: ["user_id"] },
          { columnNames: ["is_bot"] },
          { columnNames: ["posted_at"] },
          { columnNames: ["deleted_at"] },
          { columnNames: ["is_permanent"] },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("messages");
  }
}
