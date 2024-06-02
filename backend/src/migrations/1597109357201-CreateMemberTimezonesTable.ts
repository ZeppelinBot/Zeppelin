import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateMemberTimezonesTable1597109357201 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "member_timezones",
        columns: [
          {
            name: "guild_id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "member_id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "timezone",
            type: "varchar",
            length: "255",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("member_timezones");
  }
}
