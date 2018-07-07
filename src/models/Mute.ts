import Model from "./Model";

export default class Mute extends Model {
  public guild_id: string;
  public user_id: string;
  public created_at: string;
  public expires_at: string;
}
