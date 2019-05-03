import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class TurnNameHistoryToNicknameHistory1556913287547 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropColumn("name_history", "type");

    // As a raw query because of some bug with renameColumn that generated an invalid query
    await queryRunner.query(`
        ALTER TABLE \`name_history\`
          CHANGE COLUMN \`value\` \`nickname\` VARCHAR(160) NULL DEFAULT 'NULL' COLLATE 'utf8mb4_swedish_ci' AFTER \`user_id\`;
      `);

    // Drop unneeded timestamp column index
    await queryRunner.dropIndex("name_history", "IDX_6bd0600f9d55d4e4a08b508999");

    await queryRunner.renameTable("name_history", "nickname_history");
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.addColumn(
      "nickname_history",
      new TableColumn({
        name: "type",
        type: "tinyint",
        unsigned: true,
      }),
    );

    // As a raw query because of some bug with renameColumn that generated an invalid query
    await queryRunner.query(`
        ALTER TABLE \`nickname_history\`
          CHANGE COLUMN \`nickname\` \`value\` VARCHAR(160) NULL DEFAULT 'NULL' COLLATE 'utf8mb4_swedish_ci' AFTER \`user_id\`
      `);

    await queryRunner.renameTable("nickname_history", "name_history");
  }
}
