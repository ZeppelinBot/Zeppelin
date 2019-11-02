import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateNameHistoryTable1546778415930 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "name_history",
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
            name: "user_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "type",
            type: "tinyint",
            unsigned: true,
          },
          {
            name: "value",
            type: "varchar",
            length: "128",
            isNullable: true,
          },
          {
            name: "timestamp",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
          },
        ],
        indices: [
          {
            columnNames: ["guild_id", "user_id"],
          },
          {
            columnNames: ["type"],
          },
          {
            columnNames: ["timestamp"],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("name_history");
  }
}
