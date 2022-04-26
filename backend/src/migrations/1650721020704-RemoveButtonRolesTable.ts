import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class RemoveButtonRolesTable1650721020704 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("button_roles");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "button_roles",
        columns: [
          {
            name: "guild_id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "channel_id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "message_id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "button_id",
            type: "varchar",
            length: "100",
            isPrimary: true,
            isUnique: true,
          },
          {
            name: "button_group",
            type: "varchar",
            length: "100",
          },
          {
            name: "button_name",
            type: "varchar",
            length: "100",
          },
        ],
      }),
    );
  }
}
