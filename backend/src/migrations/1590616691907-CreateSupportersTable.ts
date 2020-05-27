import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateSupportersTable1590616691907 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "supporters",
        columns: [
          {
            name: "user_id",
            type: "bigint",
            unsigned: true,
            isPrimary: true,
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
          },
          {
            name: "amount",
            type: "decimal",
            precision: 6,
            scale: 2,
            isNullable: true,
            default: null,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("supporters");
  }
}
