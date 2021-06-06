import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class OrderReactionRoles1622939525343 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "reaction_roles",
      new TableColumn({
        name: "order",
        type: "int",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("reaction_roles", "order");
  }
}
