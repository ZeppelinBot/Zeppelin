import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateCounterTables1612010765767 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(
      new Table({
        name: "counters",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "guild_id",
            type: "bigint",
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
          },
          {
            name: "per_channel",
            type: "boolean",
          },
          {
            name: "per_user",
            type: "boolean",
          },
          {
            name: "last_decay_at",
            type: "datetime",
          },
          {
            name: "delete_at",
            type: "datetime",
            isNullable: true,
            default: null,
          },
        ],
        indices: [
          {
            columnNames: ["guild_id", "name"],
            isUnique: true,
          },
          {
            columnNames: ["delete_at"],
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "counter_values",
        columns: [
          {
            name: "id",
            type: "bigint",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "counter_id",
            type: "int",
          },
          {
            name: "channel_id",
            type: "bigint",
          },
          {
            name: "user_id",
            type: "bigint",
          },
          {
            name: "value",
            type: "int",
          },
        ],
        indices: [
          {
            columnNames: ["counter_id", "channel_id", "user_id"],
            isUnique: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ["counter_id"],
            referencedTableName: "counters",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "counter_triggers",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "counter_id",
            type: "int",
          },
          {
            name: "comparison_op",
            type: "varchar",
            length: "16",
          },
          {
            name: "comparison_value",
            type: "int",
          },
          {
            name: "delete_at",
            type: "datetime",
            isNullable: true,
            default: null,
          },
        ],
        indices: [
          {
            columnNames: ["counter_id", "comparison_op", "comparison_value"],
            isUnique: true,
          },
          {
            columnNames: ["delete_at"],
          },
        ],
        foreignKeys: [
          {
            columnNames: ["counter_id"],
            referencedTableName: "counters",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "counter_trigger_states",
        columns: [
          {
            name: "id",
            type: "bigint",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "trigger_id",
            type: "int",
          },
          {
            name: "channel_id",
            type: "bigint",
          },
          {
            name: "user_id",
            type: "bigint",
          },
        ],
        indices: [
          {
            columnNames: ["trigger_id", "channel_id", "user_id"],
            isUnique: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ["trigger_id"],
            referencedTableName: "counter_triggers",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable("counter_trigger_states");
    await queryRunner.dropTable("counter_triggers");
    await queryRunner.dropTable("counter_values");
    await queryRunner.dropTable("counters");
  }
}
