import { getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { Tag } from "./entities/Tag";
import { TagResponse } from "./entities/TagResponse";

export class GuildTags extends BaseGuildRepository {
  private tags: Repository<Tag>;
  private tagResponses: Repository<TagResponse>;

  constructor(guildId) {
    super(guildId);
    this.tags = getRepository(Tag);
    this.tagResponses = getRepository(TagResponse);
  }

  async all(): Promise<Tag[]> {
    return this.tags.find({
      where: {
        guild_id: this.guildId,
      },
    });
  }

  async find(tag): Promise<Tag | undefined> {
    return this.tags.findOne({
      where: {
        guild_id: this.guildId,
        tag,
      },
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
          created_at: () => "NOW()",
        })
        .where("guild_id = :guildId", { guildId: this.guildId })
        .andWhere("tag = :tag", { tag })
        .execute();
    } else {
      await this.tags.insert({
        guild_id: this.guildId,
        user_id: userId,
        tag,
        body,
      });
    }
  }

  async delete(tag) {
    await this.tags.delete({
      guild_id: this.guildId,
      tag,
    });
  }

  async findResponseByCommandMessageId(messageId: string): Promise<TagResponse | undefined> {
    return this.tagResponses.findOne({
      where: {
        guild_id: this.guildId,
        command_message_id: messageId,
      },
    });
  }

  async findResponseByResponseMessageId(messageId: string): Promise<TagResponse | undefined> {
    return this.tagResponses.findOne({
      where: {
        guild_id: this.guildId,
        response_message_id: messageId,
      },
    });
  }

  async addResponse(cmdMessageId, responseMessageId) {
    await this.tagResponses.insert({
      guild_id: this.guildId,
      command_message_id: cmdMessageId,
      response_message_id: responseMessageId,
    });
  }
}
