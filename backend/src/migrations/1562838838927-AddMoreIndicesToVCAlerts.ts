import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class AddMoreIndicesToVCAlerts1562838838927 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const table = (await queryRunner.getTable("vc_alerts"))!;
    await table.addIndex(
      new TableIndex({
        columnNames: ["requestor_id"],
      }),
    );
    await table.addIndex(
      new TableIndex({
        columnNames: ["expires_at"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    const table = (await queryRunner.getTable("vc_alerts"))!;
    await table.removeIndex(
      new TableIndex({
        columnNames: ["requestor_id"],
      }),
    );
    await table.removeIndex(
      new TableIndex({
        columnNames: ["expires_at"],
      }),
    );
  }
}
