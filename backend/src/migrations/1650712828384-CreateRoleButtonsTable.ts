import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateRoleButtonsTable1650712828384 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "role_buttons",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "guild_id",
            type: "bigint",
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
          },
          {
            name: "channel_id",
            type: "bigint",
          },
          {
            name: "message_id",
            type: "bigint",
          },
          {
            name: "hash",
            type: "text",
          },
        ],
        indices: [
          {
            columnNames: ["guild_id", "name"],
            isUnique: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("role_buttons");
  }
}
