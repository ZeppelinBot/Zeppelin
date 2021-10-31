import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePhishermanKeyCacheTable1635596150234 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "phisherman_key_cache",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "hash",
            type: "varchar",
            length: "255",
            isUnique: true,
          },
          {
            name: "is_valid",
            type: "tinyint",
          },
          {
            name: "expires_at",
            type: "datetime",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("phisherman_key_cache");
  }
}
