import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateDataExportsTable1793325542754 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "portal_data_exports",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "code",
            type: "varchar",
            length: "255",
          },
          {
            name: "ref",
            type: "varchar",
            length: "255",
          },
          {
            name: "status",
            type: "varchar",
            length: "255",
          },
          {
            name: "file_path",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "completed_at",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
            isNullable: true,
          },
        ],
        indices: [
          {
            columnNames: ["code"],
            isUnique: true,
          },
          {
            columnNames: ["ref"],
            isUnique: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("portal_data_exports");
  }
}
