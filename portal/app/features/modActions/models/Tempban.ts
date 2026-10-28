import { TempbanSchema } from "#database/schema";

export class Tempban extends TempbanSchema {
  static table = "tempbans";
}

export default Tempban;
