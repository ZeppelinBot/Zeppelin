import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddTypeAndPermissionsToApiPermissions1573158035867 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    try {
      await queryRunner.dropPrimaryKey("api_permissions");
    } catch {} // tslint:disable-line

    const table = (await queryRunner.getTable("api_permissions"))!;
    if (table.indices.length) {
      await queryRunner.dropIndex("api_permissions", table.indices[0]);
    }

    await queryRunner.addColumn(
      "api_permissions",
      new TableColumn({
        name: "type",
        type: "varchar",
        length: "16",
      }),
    );

    await queryRunner.renameColumn("api_permissions", "user_id", "target_id");

    await queryRunner.createPrimaryKey("api_permissions", ["guild_id", "type", "target_id"]);

    await queryRunner.dropColumn("api_permissions", "role");

    await queryRunner.addColumn(
      "api_permissions",
      new TableColumn({
        name: "permissions",
        type: "text",
      }),
    );

    await queryRunner.query(`
        UPDATE api_permissions
        SET type='USER',
            permissions='EDIT_CONFIG'
      `);

    await queryRunner.createIndex(
      "api_permissions",
      new TableIndex({
        columnNames: ["type", "target_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropIndex("api_permissions", "IDX_e06d750f13e6a4b4d3d6b847a9");

    await queryRunner.dropColumn("api_permissions", "permissions");

    await queryRunner.addColumn(
      "api_permissions",
      new TableColumn({
        name: "role",
        type: "varchar",
        length: "32",
      }),
    );

    await queryRunner.dropPrimaryKey("api_permissions");

    await queryRunner.renameColumn("api_permissions", "target_id", "user_id");

    await queryRunner.dropColumn("api_permissions", "type");

    await queryRunner.createIndex(
      "api_permissions",
      new TableIndex({
        columnNames: ["user_id"],
      }),
    );

    await queryRunner.createPrimaryKey("api_permissions", ["guild_id", "user_id"]);
  }
}
