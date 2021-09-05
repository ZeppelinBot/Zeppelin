import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddExpiresAtToApiPermissions1630837386329 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("api_permissions", [
      new TableColumn({
        name: "expires_at",
        type: "datetime",
        isNullable: true,
        default: null,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("api_permissions", "expires_at");
  }
}
