import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class SplitScheduledPostsPostAtIndex1632582078622 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("scheduled_posts", "IDX_c383ecfbddd8b625a0912ded3e");
    await queryRunner.createIndex(
      "scheduled_posts",
      new TableIndex({
        columnNames: ["guild_id"],
      }),
    );
    await queryRunner.createIndex(
      "scheduled_posts",
      new TableIndex({
        columnNames: ["post_at"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("scheduled_posts", "IDX_e3ce9a618354f29256712abc5c");
    await queryRunner.dropIndex("scheduled_posts", "IDX_b30f532b58ec5caf116389486f");
    await queryRunner.createIndex(
      "scheduled_posts",
      new TableIndex({
        columnNames: ["guild_id", "post_at"],
      }),
    );
  }
}
