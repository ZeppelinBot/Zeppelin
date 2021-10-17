import { MigrationInterface, QueryRunner, TableForeignKey } from "typeorm";

export class RemoveTagResponsesForeignKeys1634459708599 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey("tag_responses", "FK_5f5cf713420286acfa714b98312");
    await queryRunner.dropForeignKey("tag_responses", "FK_a0da4586031d332a6bc298925e3");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createForeignKey(
      "tag_responses",
      new TableForeignKey({
        name: "FK_5f5cf713420286acfa714b98312",
        columnNames: ["command_message_id"],
        referencedTableName: "messages",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "tag_responses",
      new TableForeignKey({
        name: "FK_a0da4586031d332a6bc298925e3",
        columnNames: ["response_message_id"],
        referencedTableName: "messages",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }
}
