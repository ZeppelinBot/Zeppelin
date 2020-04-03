import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddActiveFollowsToLocateUser1580654617890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.addColumn(
      "vc_alerts",
      new TableColumn({
        name: "active",
        type: "boolean",
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropColumn("vc_alerts", "active");
  }
}
