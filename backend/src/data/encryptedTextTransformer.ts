import { ValueTransformer } from "typeorm";
import { decrypt, encrypt } from "../utils/crypt";

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
