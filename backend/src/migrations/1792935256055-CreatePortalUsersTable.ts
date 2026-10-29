import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePortalUsersTable1792935256055 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "portal_users",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "discord_user_id",
            type: "bigint",
          },
          {
            name: "discord_username",
            type: "varchar",
            length: "255",
          },
          {
            name: "discord_avatar_url",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "last_login_at",
            type: "datetime",
          },
          {
            name: "created_at",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
          },
        ],
        indices: [
          {
            columnNames: ["discord_user_id"],
            isUnique: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("portal_users");
  }
}
