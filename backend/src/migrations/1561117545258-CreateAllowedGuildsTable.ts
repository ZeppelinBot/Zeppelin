import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateAllowedGuildsTable1561117545258 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "allowed_guilds",
        columns: [
          {
            name: "guild_id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
          },
          {
            name: "icon",
            type: "varchar",
            length: "255",
            collation: "ascii_general_ci",
            isNullable: true,
          },
          {
            name: "owner_id",
            type: "bigint",
          },
        ],
        indices: [{ columnNames: ["owner_id"] }],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("allowed_guilds", true);
  }
}
