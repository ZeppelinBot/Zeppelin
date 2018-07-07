import Model from "./Model";

export default class ModAction extends Model {
  public id: number;
  public guild_id: string;
  public case_number: number;
  public user_id: string;
  public user_name: string;
  public mod_id: string;
  public mod_name: string;
  public action_type: number;
  public audit_log_id: string;
  public created_at: string;
}
