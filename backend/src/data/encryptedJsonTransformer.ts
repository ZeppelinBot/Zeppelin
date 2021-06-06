import { ValueTransformer } from "typeorm";
import { decrypt, encrypt } from "../utils/crypt";

interface EncryptedJsonTransformer<T> extends ValueTransformer {
  from(dbValue: any): T;
  to(entityValue: T): any;
}

export function createEncryptedJsonTransformer<T>(): EncryptedJsonTransformer<T> {
  return {
    // Database -> Entity
    from(dbValue) {
      const decrypted = decrypt(dbValue);
      return JSON.parse(decrypted) as T;
    },

    // Entity -> Database
    to(entityValue) {
      return encrypt(JSON.stringify(entityValue));
    },
  };
}
