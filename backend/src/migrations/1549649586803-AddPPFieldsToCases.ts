import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPPFieldsToCases1549649586803 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        ALTER TABLE \`cases\`
          ADD COLUMN \`pp_id\` BIGINT NULL,
          ADD COLUMN \`pp_name\` VARCHAR(128) NULL
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        ALTER TABLE \`cases\`
          DROP COLUMN \`pp_id\`,
          DROP COLUMN \`pp_name\`
      `);
  }
}
