import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class CreateRestoredRolesColumn1608608903570 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.addColumn(
      "mutes",
      new TableColumn({
        name: "roles_to_restore",
        type: "text",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropColumn("mutes", "roles_to_restore");
  }
}
