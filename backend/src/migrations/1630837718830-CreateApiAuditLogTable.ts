import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateApiAuditLogTable1630837718830 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "api_audit_log",
        columns: [
          {
            name: "id",
            type: "int",
            unsigned: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "guild_id",
            type: "bigint",
          },
          {
            name: "author_id",
            type: "bigint",
          },
          {
            name: "event_type",
            type: "varchar",
            length: "255",
          },
          {
            name: "event_data",
            type: "longtext",
          },
          {
            name: "created_at",
            type: "datetime",
            default: "(NOW())",
          },
        ],
        indices: [
          new TableIndex({
            columnNames: ["guild_id", "author_id"],
          }),
          new TableIndex({
            columnNames: ["guild_id", "event_type"],
          }),
          new TableIndex({
            columnNames: ["created_at"],
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("api_audit_log");
  }
}
