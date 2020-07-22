import { MigrationInterface, QueryRunner, Table, TableColumn } from "typeorm";

export class MoveStarboardsToConfig1573248462469 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    // Create the new column for the channels id
    const chanid_column = new TableColumn({
      name: "starboard_channel_id",
      type: "bigint",
      unsigned: true,
    });
    await queryRunner.addColumn("starboard_messages", chanid_column);

    // Since we are removing the guild_id with the starboards table, we might want it here
    const guid_column = new TableColumn({
      name: "guild_id",
      type: "bigint",
      unsigned: true,
    });
    await queryRunner.addColumn("starboard_messages", guid_column);

    // Migrate the old starboard_id to the new starboard_channel_id
    await queryRunner.query(`
            UPDATE starboard_messages AS sm
            JOIN starboards AS sb
            ON sm.starboard_id = sb.id
            SET sm.starboard_channel_id = sb.channel_id, sm.guild_id = sb.guild_id;
            `);

    // Drop the starboard_id column as it is now obsolete
    await queryRunner.dropColumn("starboard_messages", "starboard_id");
    // Set new Primary Key
    await queryRunner.dropPrimaryKey("starboard_messages");
    await queryRunner.createPrimaryKey("starboard_messages", ["starboard_message_id"]);
    // Finally, drop the starboards channel as it is now obsolete
    await queryRunner.dropTable("starboards", true);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropColumn("starboard_messages", "starboard_channel_id");
    await queryRunner.dropColumn("starboard_messages", "guild_id");

    const sbId = new TableColumn({
      name: "starboard_id",
      type: "int",
      unsigned: true,
    });
    await queryRunner.addColumn("starboard_messages", sbId);

    await queryRunner.dropPrimaryKey("starboard_messages");
    await queryRunner.createPrimaryKey("starboard_messages", ["starboard_id", "message_id"]);

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
  }
}
