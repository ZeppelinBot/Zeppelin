import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRepeatColumnsToScheduledPosts1575230079526 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.addColumns("scheduled_posts", [
      new TableColumn({
        name: "repeat_interval",
        type: "integer",
        unsigned: true,
        isNullable: true,
      }),
      new TableColumn({
        name: "repeat_until",
        type: "datetime",
        isNullable: true,
      }),
      new TableColumn({
        name: "repeat_times",
        type: "integer",
        unsigned: true,
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropColumn("scheduled_posts", "repeat_interval");
    await queryRunner.dropColumn("scheduled_posts", "repeat_until");
    await queryRunner.dropColumn("scheduled_posts", "repeat_times");
  }
}
