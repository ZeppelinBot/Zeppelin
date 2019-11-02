import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateScheduledPostsTable1556973844545 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "scheduled_posts",
        columns: [
          {
            name: "id",
            type: "int",
            unsigned: true,
            isGenerated: true,
            generationStrategy: "increment",
            isPrimary: true,
          },
          {
            name: "guild_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "author_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "author_name",
            type: "varchar",
            length: "160",
          },
          {
            name: "channel_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "content",
            type: "text",
          },
          {
            name: "attachments",
            type: "text",
          },
          {
            name: "post_at",
            type: "datetime",
          },
          {
            name: "enable_mentions",
            type: "tinyint",
            unsigned: true,
            default: 0,
          },
        ],
        indices: [
          {
            columnNames: ["guild_id", "post_at"],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("scheduled_posts", true);
  }
}
