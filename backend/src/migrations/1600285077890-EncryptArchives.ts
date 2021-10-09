import { MigrationInterface, QueryRunner } from "typeorm";
import { decrypt, encrypt } from "../utils/crypt";

export class EncryptArchives1600285077890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const archives = await queryRunner.query("SELECT id, body FROM archives");
    for (const archive of archives) {
      const encryptedBody = await encrypt(archive.body);
      await queryRunner.query("UPDATE archives SET body = ? WHERE id = ?", [encryptedBody, archive.id]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    const archives = await queryRunner.query("SELECT id, body FROM archives");
    for (const archive of archives) {
      const decryptedBody = await decrypt(archive.body);
      await queryRunner.query("UPDATE archives SET body = ? WHERE id = ?", [decryptedBody, archive.id]);
    }
  }
}
