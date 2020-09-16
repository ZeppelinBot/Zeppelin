import { decrypt, encrypt } from "../utils/crypt";
import { ValueTransformer } from "typeorm";

interface EncryptedTextTransformer extends ValueTransformer {
  from(dbValue: any): string;
  to(entityValue: string): any;
}

export function createEncryptedTextTransformer(): EncryptedTextTransformer {
  return {
    // Database -> Entity
    from(dbValue) {
      return decrypt(dbValue);
    },

    // Entity -> Database
    to(entityValue) {
      return encrypt(entityValue);
    },
  };
}
