import Model from "./Model";

export default class SpamLog extends Model {
  public id: string;
  public guild_id: string;
  public body: string;
  public created_at: string;
  public expires_at: string;
}
