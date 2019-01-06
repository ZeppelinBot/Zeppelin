import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeNameHistoryValueLengthLonger1546788508314 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        ALTER TABLE \`name_history\`
	        CHANGE COLUMN \`value\` \`value\` VARCHAR(160) NULL DEFAULT NULL COLLATE 'utf8mb4_swedish_ci' AFTER \`type\`;
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        ALTER TABLE \`name_history\`
	        CHANGE COLUMN \`value\` \`value\` VARCHAR(128) NULL DEFAULT NULL COLLATE 'utf8mb4_swedish_ci' AFTER \`type\`;
      `);
  }
}
