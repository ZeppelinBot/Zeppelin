import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateRoleQueueTable1650709103864 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "role_queue",
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
            name: "user_id",
            type: "bigint",
          },
          {
            name: "role_id",
            type: "bigint",
          },
          {
            name: "should_add",
            type: "boolean",
          },
          {
            name: "priority",
            type: "smallint",
            default: 0,
          },
        ],
        indices: [
          {
            columnNames: ["guild_id"],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("role_queue");
  }
}
