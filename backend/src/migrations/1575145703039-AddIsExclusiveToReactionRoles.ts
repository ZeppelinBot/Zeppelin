import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddIsExclusiveToReactionRoles1575145703039 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.addColumn(
      "reaction_roles",
      new TableColumn({
        name: "is_exclusive",
        type: "tinyint",
        unsigned: true,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropColumn("reaction_roles", "is_exclusive");
  }
}
