import Model from "./Model";

export default class CaseNote extends Model {
  public id: number;
  public case_id: number;
  public mod_id: string;
  public mod_name: string;
  public body: string;
  public created_at: string;
}
