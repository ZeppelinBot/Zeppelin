import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddTypeAndPermissionsToApiPermissions1573158035867 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    // We can't use a TableIndex object in dropIndex directly as the table name is included in the generated index name
    // and the table name has changed since the original index was created
    const originalIndexName = queryRunner.connection.namingStrategy.indexName("dashboard_users", ["user_id"]);
    await queryRunner.dropIndex("api_permissions", originalIndexName);

    await queryRunner.addColumn(
      "api_permissions",
      new TableColumn({
        name: "type",
        type: "varchar",
        length: "16",
      }),
    );

    await queryRunner.renameColumn("api_permissions", "user_id", "target_id");

    await queryRunner.query(`
      ALTER TABLE api_permissions
        DROP PRIMARY KEY,
        ADD PRIMARY KEY(\`guild_id\`, \`type\`, \`target_id\`);
    `);

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
    await queryRunner.dropIndex(
      "api_permissions",
      new TableIndex({
        columnNames: ["type", "target_id"],
      }),
    );

    await queryRunner.dropColumn("api_permissions", "permissions");

    await queryRunner.addColumn(
      "api_permissions",
      new TableColumn({
        name: "role",
        type: "varchar",
        length: "32",
      }),
    );

    await queryRunner.query(`
      ALTER TABLE api_permissions
        DROP PRIMARY KEY,
        ADD PRIMARY KEY(\`guild_id\`, \`type\`);
    `);

    await queryRunner.renameColumn("api_permissions", "target_id", "user_id");

    await queryRunner.dropColumn("api_permissions", "type");

    await queryRunner.createIndex(
      "api_permissions",
      new TableIndex({
        columnNames: ["user_id"],
      }),
    );
  }
}
