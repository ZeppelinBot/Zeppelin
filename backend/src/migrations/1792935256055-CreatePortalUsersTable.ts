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
            name: "user_id",
            type: "bigint",
          },
          {
            name: "username",
            type: "varchar",
            length: "255",
          },
          {
            name: "avatar",
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
            columnNames: ["user_id"],
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
