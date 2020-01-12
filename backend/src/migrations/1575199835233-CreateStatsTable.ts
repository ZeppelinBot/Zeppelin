import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateStatsTable1575199835233 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "stats",
        columns: [
          {
            name: "id",
            type: "bigint",
            unsigned: true,
            isPrimary: true,
            generationStrategy: "increment",
          },
          {
            name: "guild_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "source",
            type: "varchar",
            length: "64",
            collation: "ascii_bin",
          },
          {
            name: "key",
            type: "varchar",
            length: "64",
            collation: "ascii_bin",
          },
          {
            name: "value",
            type: "integer",
            unsigned: true,
          },
          {
            name: "created_at",
            type: "datetime",
            default: "NOW()",
          },
        ],
        indices: [
          {
            columnNames: ["guild_id", "source", "key"],
          },
          {
            columnNames: ["created_at"],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("stats");
  }
}
