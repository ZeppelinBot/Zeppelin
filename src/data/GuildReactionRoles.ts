import knex from "../knex";
import ReactionRole from "../models/ReactionRole";

export class GuildReactionRoles {
  protected guildId: string;

  constructor(guildId) {
    this.guildId = guildId;
  }

  async all(): Promise<ReactionRole[]> {
    const results = await knex("reaction_roles")
      .where("guild_id", this.guildId)
      .select();

    return results.map(r => new ReactionRole(r));
  }

  async getForMessage(messageId: string): Promise<ReactionRole[]> {
    const results = await knex("reaction_roles")
      .where("guild_id", this.guildId)
      .where("message_id", messageId)
      .select();

    return results.map(r => new ReactionRole(r));
  }

  async getByMessageAndEmoji(messageId: string, emoji: string): Promise<ReactionRole> {
    const result = await knex("reaction_roles")
      .where("guild_id", this.guildId)
      .where("message_id", messageId)
      .where("emoji", emoji)
      .first();

    return result ? new ReactionRole(result) : null;
  }

  async removeFromMessage(messageId: string, emoji: string = null) {
    let query = knex("reaction_roles")
      .where("guild_id", this.guildId)
      .where("message_id", messageId);

    if (emoji) {
      query = query.where("emoji", emoji);
    }

    await query.delete();
  }

  async add(channelId: string, messageId: string, emoji: string, roleId: string) {
    await knex("reaction_roles").insert({
      guild_id: this.guildId,
      channel_id: channelId,
      message_id: messageId,
      emoji,
      role_id: roleId
    });
  }
}
