import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandCounterTriggerConditionFields1632560756499 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    // INT(11) -> INT(32)
    await queryRunner.query(`
        ALTER TABLE \`counter_triggers\`
          CHANGE COLUMN \`comparison_value\` \`comparison_value\` INT(32) NOT NULL AFTER \`comparison_op\`,
          CHANGE COLUMN \`reverse_comparison_value\` \`reverse_comparison_value\` INT(32) NOT NULL AFTER \`reverse_comparison_op\`
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    // INT(32) -> INT(11)
    await queryRunner.query(`
        ALTER TABLE \`counter_triggers\`
          CHANGE COLUMN \`comparison_value\` \`comparison_value\` INT(11) NOT NULL AFTER \`comparison_op\`,
          CHANGE COLUMN \`reverse_comparison_value\` \`reverse_comparison_value\` INT(11) NOT NULL AFTER \`reverse_comparison_op\`
      `);
  }
}
