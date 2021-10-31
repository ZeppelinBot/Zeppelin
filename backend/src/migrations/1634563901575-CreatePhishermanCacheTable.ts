import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePhishermanCacheTable1634563901575 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "phisherman_cache",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "domain",
            type: "varchar",
            length: "255",
            isUnique: true,
          },
          {
            name: "data",
            type: "text",
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
    await queryRunner.dropTable("phisherman_cache");
  }
}
