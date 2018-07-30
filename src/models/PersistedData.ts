import Model from "./Model";

export default class PersistedData extends Model {
  private _roles;
  private _isVoiceMuted;

  public guild_id: string;
  public user_id: string;
  public nickname: string;

  set roles(v) {
    this._roles = v ? v.split(",") : [];
  }

  get roles() {
    return this._roles;
  }

  set is_voice_muted(v) {
    this._isVoiceMuted = v === 1;
  }

  get is_voice_muted() {
    return this._isVoiceMuted;
  }
}
