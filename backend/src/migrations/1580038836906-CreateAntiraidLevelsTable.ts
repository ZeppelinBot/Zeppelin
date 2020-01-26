import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateAntiraidLevelsTable1580038836906 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "antiraid_levels",
        columns: [
          {
            name: "guild_id",
            type: "bigint",
            unsigned: true,
            isPrimary: true,
          },
          {
            name: "level",
            type: "varchar",
            length: "64",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("antiraid_levels");
  }
}
