import { getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { ScheduledPost } from "./entities/ScheduledPost";

export class GuildScheduledPosts extends BaseGuildRepository {
  private scheduledPosts: Repository<ScheduledPost>;

  constructor(guildId) {
    super(guildId);
    this.scheduledPosts = getRepository(ScheduledPost);
  }

  all(): Promise<ScheduledPost[]> {
    return this.scheduledPosts.createQueryBuilder().where("guild_id = :guildId", { guildId: this.guildId }).getMany();
  }

  getDueScheduledPosts(): Promise<ScheduledPost[]> {
    return this.scheduledPosts
      .createQueryBuilder()
      .where("guild_id = :guildId", { guildId: this.guildId })
      .andWhere("post_at <= NOW()")
      .getMany();
  }

  find(id: number) {
    return this.scheduledPosts.findOne({ id });
  }

  async delete(id) {
    await this.scheduledPosts.delete({
      guild_id: this.guildId,
      id,
    });
  }

  async create(data: Partial<ScheduledPost>) {
    const result = await this.scheduledPosts.insert({
      ...data,
      guild_id: this.guildId,
    });

    return (await this.find(result.identifiers[0].id))!;
  }

  async update(id: number, data: Partial<ScheduledPost>) {
    await this.scheduledPosts.update(id, data);
  }
}
