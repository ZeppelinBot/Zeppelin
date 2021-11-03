import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSourceMessageIdToReminders1635950555533 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("reminders", [
      new TableColumn({
        name: "source_message_id",
        type: "bigint",
        isNullable: true,
        default: null,
        unsigned: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("reminders", "source_message_id");
  }
}
