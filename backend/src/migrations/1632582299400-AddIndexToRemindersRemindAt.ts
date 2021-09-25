import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class AddIndexToRemindersRemindAt1632582299400 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      "reminders",
      new TableIndex({
        columnNames: ["remind_at"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("reminders", "IDX_6f4e1a9db3410c43c7545ff060");
  }
}
