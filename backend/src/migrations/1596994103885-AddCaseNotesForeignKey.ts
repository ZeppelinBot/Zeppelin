import { MigrationInterface, QueryRunner, TableForeignKey } from "typeorm";

export class AddCaseNotesForeignKey1596994103885 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createForeignKey(
      "case_notes",
      new TableForeignKey({
        name: "case_notes_case_id_fk",
        columnNames: ["case_id"],
        referencedTableName: "cases",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropForeignKey("case_notes", "case_notes_case_id_fk");
  }
}
