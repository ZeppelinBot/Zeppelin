import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class CreateReminderCreatedAtField1578445483917 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.addColumn(
      "reminders",
      new TableColumn({
        name: "created_at",
        type: "datetime",
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropColumn("reminders", "created_at");
  }
}
