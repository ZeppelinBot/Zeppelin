import { Tag } from "./entities/Tag";
import { getRepository, Repository } from "typeorm";
import { BaseRepository } from "./BaseRepository";

export class GuildTags extends BaseRepository {
  private tags: Repository<Tag>;

  constructor(guildId) {
    super(guildId);
    this.tags = getRepository(Tag);
  }

  async find(tag): Promise<Tag> {
    return this.tags.findOne({
      where: {
        guild_id: this.guildId,
        tag
      }
    });
  }

  async createOrUpdate(tag, body, userId) {
    const existingTag = await this.find(tag);
    if (existingTag) {
      await this.tags
        .createQueryBuilder()
        .update()
        .set({
          body,
          user_id: userId,
          created_at: () => "NOW()"
        })
        .where("guild_id = :guildId", { guildId: this.guildId })
        .andWhere("tag = :tag", { tag })
        .execute();
    } else {
      await this.tags.insert({
        guild_id: this.guildId,
        user_id: userId,
        tag,
        body
      });
    }
  }

  async delete(tag) {
    await this.tags.delete({
      guild_id: this.guildId,
      tag
    });
  }
}
