import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class AddIndexToArchivesExpiresAt1547392046629 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createIndex(
      "archives",
      new TableIndex({
        columnNames: ["expires_at"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropIndex(
      "archives",
      new TableIndex({
        columnNames: ["expires_at"],
      }),
    );
  }
}
