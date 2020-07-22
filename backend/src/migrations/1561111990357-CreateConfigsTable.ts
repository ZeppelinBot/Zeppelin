import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateConfigsTable1561111990357 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "configs",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "key",
            type: "varchar",
            length: "48",
          },
          {
            name: "config",
            type: "mediumtext",
          },
          {
            name: "is_active",
            type: "tinyint",
          },
          {
            name: "edited_by",
            type: "bigint",
          },
          {
            name: "edited_at",
            type: "datetime",
            default: "now()",
          },
        ],
        indices: [
          {
            columnNames: ["key", "is_active"],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("configs", true);
  }
}
