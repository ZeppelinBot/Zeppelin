import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateTagResponsesTable1546770935261 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "tag_responses",
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
            name: "command_message_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "response_message_id",
            type: "bigint",
            unsigned: true,
          },
        ],
        indices: [
          {
            columnNames: ["guild_id"],
          },
        ],
        foreignKeys: [
          {
            columnNames: ["command_message_id"],
            referencedTableName: "messages",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
          {
            columnNames: ["response_message_id"],
            referencedTableName: "messages",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("tag_responses");
  }
}
