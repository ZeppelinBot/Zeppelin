import { getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { TagAlias } from "./entities/TagAlias";

export class GuildTagAliases extends BaseGuildRepository {
  private tagAliases: Repository<TagAlias>;

  constructor(guildId) {
    super(guildId);
    this.tagAliases = getRepository(TagAlias);
  }

  async all(): Promise<TagAlias[]> {
    return this.tagAliases.find({
      where: {
        guild_id: this.guildId,
      },
    });
  }

  async find(alias): Promise<TagAlias | undefined> {
    return this.tagAliases.findOne({
      where: {
        guild_id: this.guildId,
        alias,
      },
    });
  }

  async findAllWithTag(tag): Promise<TagAlias[] | undefined> {
    const all = await this.all();
    const aliases = all.filter((a) => a.tag === tag);
    return aliases.length > 0 ? aliases : undefined;
  }

  async createOrUpdate(alias, tag, userId) {
    const existingTagAlias = await this.find(alias);
    if (existingTagAlias) {
      await this.tagAliases
        .createQueryBuilder()
        .update()
        .set({
          tag,
          user_id: userId,
          created_at: () => "NOW()",
        })
        .where("guild_id = :guildId", { guildId: this.guildId })
        .andWhere("alias = :alias", { alias })
        .execute();
    } else {
      await this.tagAliases.insert({
        guild_id: this.guildId,
        user_id: userId,
        alias,
        tag,
      });
    }
  }

  async delete(alias) {
    await this.tagAliases.delete({
      guild_id: this.guildId,
      alias,
    });
  }
}
