import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class AddIndexToIsBot1631474131804 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      "messages",
      new TableIndex({
        columnNames: ["is_bot"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      "messages",
      new TableIndex({
        columnNames: ["is_bot"],
      }),
    );
  }
}
