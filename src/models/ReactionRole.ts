import Model from "./Model";

export default class ReactionRole extends Model {
  public guild_id: string;
  public channel_id: string;
  public message_id: string;
  public emoji: string;
  public role_id: string;
}
