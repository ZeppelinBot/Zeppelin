import { MigrationInterface, QueryRunner } from "typeorm";
import { decrypt, encrypt } from "../utils/crypt";

export class EncryptExistingMessages1600283341726 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    // 1. Delete non-permanent messages
    await queryRunner.query("DELETE FROM messages WHERE is_permanent = 0");

    // 2. Encrypt all permanent messages
    const messages = await queryRunner.query("SELECT id, data FROM messages");
    for (const message of messages) {
      const encryptedData = await encrypt(message.data);
      await queryRunner.query("UPDATE messages SET data = ? WHERE id = ?", [encryptedData, message.id]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    // Decrypt all messages
    const messages = await queryRunner.query("SELECT id, data FROM messages");
    for (const message of messages) {
      const decryptedData = await decrypt(message.data);
      await queryRunner.query("UPDATE messages SET data = ? WHERE id = ?", [decryptedData, message.id]);
    }
  }
}
