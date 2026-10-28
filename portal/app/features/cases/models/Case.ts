import { CaseSchema } from "#database/schema";

export class Case extends CaseSchema {
  static table = "cases";
}

export default Case;
