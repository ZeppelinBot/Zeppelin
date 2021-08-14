import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateContextMenuTable1628809879962 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "context_menus",
        columns: [
          {
            name: "guild_id",
            type: "bigint",
          },
          {
            name: "context_id",
            type: "bigint",
            isPrimary: true,
            isUnique: true,
          },
          {
            name: "action_name",
            type: "varchar",
            length: "100",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("context_menus");
  }
}
