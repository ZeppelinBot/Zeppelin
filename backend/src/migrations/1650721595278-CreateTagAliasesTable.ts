import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateTagAliasesTable1650721595278 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "tag_aliases",
        columns: [
          {
            name: "guild_id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "alias",
            type: "varchar",
            length: "255",
            isPrimary: true,
          },
          {
            name: "tag",
            type: "varchar",
            length: "255",
            isPrimary: true,
          },
          {
            name: "user_id",
            type: "bigint",
          },
          {
            name: "created_at",
            type: "datetime",
            default: "now()",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.dropTable("tag_aliases");
  }
}
