import { CaseNoteSchema } from "#database/schema";

export class CaseNote extends CaseNoteSchema {
  static table = "case_notes";
}

export default CaseNote;
