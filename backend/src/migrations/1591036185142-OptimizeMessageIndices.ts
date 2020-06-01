import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class OptimizeMessageIndices1591036185142 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    // guild_id, channel_id, user_id indices -> composite(guild_id, channel_id, user_id)
    await queryRunner.dropIndex("messages", "IDX_b193588441b085352a4c010942"); // guild_id
    await queryRunner.dropIndex("messages", "IDX_86b9109b155eb70c0a2ca3b4b6"); // channel_id
    await queryRunner.dropIndex("messages", "IDX_830a3c1d92614d1495418c4673"); // user_id
    await queryRunner.createIndex(
      "messages",
      new TableIndex({
        columnNames: ["guild_id", "channel_id", "user_id"],
      }),
    );

    // posted_at, is_permanent indices -> composite(posted_at, is_permanent)
    await queryRunner.dropIndex("messages", "IDX_08e1f5a0fef0175ea402c6b2ac"); // posted_at
    await queryRunner.dropIndex("messages", "IDX_f520029c07824f8d96c6cd98e8"); // is_permanent
    await queryRunner.createIndex(
      "messages",
      new TableIndex({
        columnNames: ["posted_at", "is_permanent"],
      }),
    );

    // is_bot -> no index (the database doesn't appear to use this index anyway)
    await queryRunner.dropIndex("messages", "IDX_eec2c581ff6f13595902c31840");
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    // no index -> is_bot index
    await queryRunner.createIndex("messages", new TableIndex({ columnNames: ["is_bot"] }));

    // composite(posted_at, is_permanent) -> posted_at, is_permanent indices
    await queryRunner.dropIndex("messages", "IDX_afe125bfd65341cd90eee0b310"); // composite(posted_at, is_permanent)
    await queryRunner.createIndex("messages", new TableIndex({ columnNames: ["posted_at"] }));
    await queryRunner.createIndex("messages", new TableIndex({ columnNames: ["is_permanent"] }));

    // composite(guild_id, channel_id, user_id) -> guild_id, channel_id, user_id indices
    await queryRunner.dropIndex("messages", "IDX_dedc3ea6396e1de8ac75533589"); // composite(guild_id, channel_id, user_id)
    await queryRunner.createIndex("messages", new TableIndex({ columnNames: ["guild_id"] }));
    await queryRunner.createIndex("messages", new TableIndex({ columnNames: ["channel_id"] }));
    await queryRunner.createIndex("messages", new TableIndex({ columnNames: ["user_id"] }));
  }
}
