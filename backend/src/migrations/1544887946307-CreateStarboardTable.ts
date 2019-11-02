import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateStarboardTable1544887946307 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "starboards",
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
            name: "channel_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "channel_whitelist",
            type: "text",
            isNullable: true,
            default: null,
          },
          {
            name: "emoji",
            type: "varchar",
            length: "64",
          },
          {
            name: "reactions_required",
            type: "smallint",
            unsigned: true,
          },
        ],
        indices: [
          {
            columnNames: ["guild_id", "emoji"],
          },
          {
            columnNames: ["guild_id", "channel_id"],
            isUnique: true,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "starboard_messages",
        columns: [
          {
            name: "starboard_id",
            type: "int",
            unsigned: true,
          },
          {
            name: "message_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "starboard_message_id",
            type: "bigint",
            unsigned: true,
          },
        ],
      }),
    );
    await queryRunner.createPrimaryKey("starboard_messages", ["starboard_id", "message_id"]);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("starboards", true);
    await queryRunner.dropTable("starboard_messages", true);
  }
}
