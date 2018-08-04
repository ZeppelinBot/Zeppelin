import knex from "../knex";
import moment from "moment-timezone";
import Mute from "../models/Mute";

export class GuildMutes {
  protected guildId: string;

  constructor(guildId) {
    this.guildId = guildId;
  }

  async getExpiredMutes(): Promise<Mute[]> {
    const result = await knex("mutes")
      .where("guild_id", this.guildId)
      .whereNotNull("expires_at")
      .whereRaw("expires_at <= NOW()")
      .select();

    return result.map(r => new Mute(r));
  }

  async findExistingMuteForUserId(userId: string): Promise<Mute> {
    const result = await knex("mutes")
      .where("guild_id", this.guildId)
      .where("user_id", userId)
      .first();

    return result ? new Mute(result) : null;
  }

  async addMute(userId, expiryTime) {
    const expiresAt = expiryTime
      ? moment()
          .add(expiryTime, "ms")
          .format("YYYY-MM-DD HH:mm:ss")
      : null;

    return knex
      .insert({
        guild_id: this.guildId,
        user_id: userId,
        expires_at: expiresAt
      })
      .into("mutes");
  }

  async updateExpiryTime(userId, newExpiryTime) {
    const expiresAt = newExpiryTime
      ? moment()
          .add(newExpiryTime, "ms")
          .format("YYYY-MM-DD HH:mm:ss")
      : null;

    return knex("mutes")
      .where("guild_id", this.guildId)
      .where("user_id", userId)
      .update({
        expires_at: expiresAt
      });
  }

  async addOrUpdateMute(userId, expiryTime) {
    const existingMute = await this.findExistingMuteForUserId(userId);

    if (existingMute) {
      return this.updateExpiryTime(userId, expiryTime);
    } else {
      return this.addMute(userId, expiryTime);
    }
  }

  async getActiveMutes(): Promise<Mute[]> {
    const result = await knex("mutes")
      .where("guild_id", this.guildId)
      .where(q => q.whereRaw("expires_at > NOW()").orWhereNull("expires_at"))
      .select();

    return result.map(r => new Mute(r));
  }

  async setCaseId(userId, caseId) {
    await knex("mutes")
      .where("guild_id", this.guildId)
      .where("user_id", userId)
      .update({ case_id: caseId });
  }

  async clear(userId) {
    return knex("mutes")
      .where("guild_id", this.guildId)
      .where("user_id", userId)
      .delete();
  }
}
