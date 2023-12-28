import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateMemberCacheTable1682788165866 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "member_cache",
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
            name: "username",
            type: "varchar",
            length: "255",
          },
          {
            name: "nickname",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "roles",
            type: "text",
          },
          {
            name: "last_seen",
            type: "date",
          },
          {
            name: "delete_at",
            type: "datetime",
            isNullable: true,
            default: null,
          },
        ],
        indices: [
          {
            columnNames: ["guild_id", "user_id"],
            isUnique: true,
          },
          {
            columnNames: ["last_seen"],
          },
          {
            columnNames: ["delete_at"],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("member_cache");
  }
}
