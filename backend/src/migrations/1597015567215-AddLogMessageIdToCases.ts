import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddLogMessageIdToCases1597015567215 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.addColumn(
      "cases",
      new TableColumn({
        name: "log_message_id",
        type: "varchar",
        length: "64",
        isNullable: true,
        default: null,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropColumn("cases", "log_message_id");
  }
}
