import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateApiUserInfoTable1561282950483 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "api_user_info",
        columns: [
          {
            name: "id",
            type: "bigint",
            isPrimary: true,
          },
          {
            name: "data",
            type: "text",
          },
          {
            name: "updated_at",
            type: "datetime",
            default: "now()",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("api_user_info", true);
  }
}
