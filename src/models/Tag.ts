import Model from "./Model";

export default class Tag extends Model {
  public guild_id: string;
  public tag: string;
  public user_id: string;
  public body: string;
  public created_at: string;
}
