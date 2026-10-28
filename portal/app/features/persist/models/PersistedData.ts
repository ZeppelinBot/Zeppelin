import { PersistedDatumSchema } from "#database/schema";

export class PersistedData extends PersistedDatumSchema {
  static table = "persisted_data";
}

export default PersistedData;
