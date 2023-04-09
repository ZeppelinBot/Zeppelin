import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddTimeoutColumnsToMutes1680354053183 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("mutes", [
      new TableColumn({
        name: "type",
        type: "tinyint",
        unsigned: true,
        default: 1, // The value for "Role" mute at the time of this migration
      }),
      new TableColumn({
        name: "mute_role",
        type: "bigint",
        unsigned: true,
        isNullable: true,
        default: null,
      }),
      new TableColumn({
        name: "timeout_expires_at",
        type: "datetime",
        isNullable: true,
        default: null,
      }),
    ]);
    await queryRunner.createIndex(
      "mutes",
      new TableIndex({
        columnNames: ["type"],
      }),
    );
    await queryRunner.createIndex(
      "mutes",
      new TableIndex({
        columnNames: ["timeout_expires_at"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("mutes", "type");
    await queryRunner.dropColumn("mutes", "mute_role");
  }
}
