import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateAutoReactionsTable1547290549908 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "auto_reactions",
        columns: [
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
            name: "reactions",
            type: "text",
          },
        ],
      }),
    );
    await queryRunner.createPrimaryKey("auto_reactions", ["guild_id", "channel_id"]);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("auto_reactions", true);
  }
}
