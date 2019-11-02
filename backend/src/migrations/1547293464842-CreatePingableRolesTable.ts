import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePingableRolesTable1547293464842 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "pingable_roles",
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
            name: "channel_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "role_id",
            type: "bigint",
            unsigned: true,
          },
        ],
        indices: [
          {
            columnNames: ["guild_id", "channel_id"],
          },
          {
            columnNames: ["guild_id", "channel_id", "role_id"],
            isUnique: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("pingable_roles", true);
  }
}
