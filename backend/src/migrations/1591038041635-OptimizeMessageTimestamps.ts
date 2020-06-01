import { MigrationInterface, QueryRunner } from "typeorm";

export class OptimizeMessageTimestamps1591038041635 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    // DATETIME(3) -> DATETIME(0)
    await queryRunner.query(`
        ALTER TABLE \`messages\`
          CHANGE COLUMN \`posted_at\` \`posted_at\` DATETIME(0) NOT NULL AFTER \`data\`,
          CHANGE COLUMN \`deleted_at\` \`deleted_at\` DATETIME(0) NULL DEFAULT NULL AFTER \`posted_at\`
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    // DATETIME(0) -> DATETIME(3)
    await queryRunner.query(`
        ALTER TABLE \`messages\`
          CHANGE COLUMN \`posted_at\` \`posted_at\` DATETIME(3) NOT NULL AFTER \`data\`,
          CHANGE COLUMN \`deleted_at\` \`deleted_at\` DATETIME(3) NULL DEFAULT NULL AFTER \`posted_at\`
      `);
  }
}
