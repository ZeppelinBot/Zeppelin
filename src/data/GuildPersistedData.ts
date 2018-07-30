import knex from "../knex";
import PersistedData from "../models/PersistedData";

export interface IPartialPersistData {
  roles?: string[];
  nickname?: string;
  is_voice_muted?: boolean;
}

export class GuildPersistedData {
  protected guildId: string;

  constructor(guildId) {
    this.guildId = guildId;
  }

  async find(userId: string) {
    const result = await knex("persisted_data")
      .where("guild_id", this.guildId)
      .where("user_id", userId)
      .first();

    return result ? new PersistedData(result) : null;
  }

  async set(userId: string, data: IPartialPersistData = {}) {
    const finalData: any = {};
    if (data.roles) finalData.roles = data.roles.join(",");
    if (data.nickname) finalData.nickname = data.nickname;
    if (data.is_voice_muted) finalData.is_voice_muted = data.is_voice_muted ? 1 : 0;

    const existing = await this.find(userId);
    if (existing) {
      await knex("persisted_data")
        .where("guild_id", this.guildId)
        .where("user_id", userId)
        .update(finalData);
    } else {
      await knex("persisted_data").insert({
        ...finalData,
        guild_id: this.guildId,
        user_id: userId
      });
    }
  }

  async clear(userId: string) {
    await knex("persisted_data")
      .where("guild_id", this.guildId)
      .where("user_id", userId)
      .delete();
  }
}
