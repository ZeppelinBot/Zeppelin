import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddIsHiddenToCases1547393619900 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.addColumn(
      "cases",
      new TableColumn({
        name: "is_hidden",
        type: "tinyint",
        unsigned: true,
        default: 0,
      }),
    );
    await queryRunner.createIndex(
      "cases",
      new TableIndex({
        columnNames: ["is_hidden"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropColumn("cases", "is_hidden");
  }
}
