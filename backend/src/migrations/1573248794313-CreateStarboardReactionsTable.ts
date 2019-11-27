import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateStarboardReactionsTable1573248794313 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "starboard_reactions",
        columns: [
          {
            name: "id",
            type: "int",
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
            name: "message_id",
            type: "bigint",
            unsigned: true,
          },
          {
            name: "reactor_id",
            type: "bigint",
            unsigned: true,
          },
        ],
        indices: [
          {
            columnNames: ["reactor_id", "message_id"],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("starboard_reactions", true, false, true);
  }
}
