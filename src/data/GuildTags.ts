import knex from "../knex";
import moment from "moment-timezone";
import Tag from "../models/Tag";

export class GuildTags {
  protected guildId: string;

  constructor(guildId) {
    this.guildId = guildId;
  }

  async find(tag): Promise<Tag> {
    const result = await knex("tags")
      .where("guild_id", this.guildId)
      .where("tag", tag)
      .first();

    return result ? new Tag(result) : null;
  }

  async createOrUpdate(tag, body, userId) {
    const existingTag = await this.find(tag);
    if (existingTag) {
      await knex("tags")
        .where("guild_id", this.guildId)
        .where("tag", tag)
        .update({
          body,
          user_id: userId,
          created_at: knex.raw("NOW()")
        });
    } else {
      await knex("tags").insert({
        guild_id: this.guildId,
        user_id: userId,
        tag,
        body
      });
    }
  }

  async delete(tag) {
    await knex("tags")
      .where("guild_id", this.guildId)
      .where("tag", tag)
      .delete();
  }
}
