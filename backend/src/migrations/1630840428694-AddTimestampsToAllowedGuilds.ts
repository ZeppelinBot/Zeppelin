import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddTimestampsToAllowedGuilds1630840428694 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("allowed_guilds", [
      new TableColumn({
        name: "created_at",
        type: "datetime",
        default: "(NOW())",
      }),
      new TableColumn({
        name: "updated_at",
        type: "datetime",
        default: "(NOW())",
        onUpdate: "CURRENT_TIMESTAMP",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("allowed_guilds", "updated_at");
    await queryRunner.dropColumn("allowed_guilds", "created_at");
  }
}
