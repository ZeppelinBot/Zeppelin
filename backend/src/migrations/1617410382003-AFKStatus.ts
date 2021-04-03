import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class AFKStatus1617410382003 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "afk",
                columns: [
                   {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                   },
                   {
                       name: "user_id",
                       type: "bigint",
                   },
                   {
                       name: "status",
                       type: "varchar",
                       length: "255",
                   }
                ]
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.dropTable("afk");
    }
}
