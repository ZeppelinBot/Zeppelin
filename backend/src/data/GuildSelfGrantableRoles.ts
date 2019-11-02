import { BaseGuildRepository } from "./BaseGuildRepository";
import { getRepository, Repository } from "typeorm";
import { SelfGrantableRole } from "./entities/SelfGrantableRole";

export class GuildSelfGrantableRoles extends BaseGuildRepository {
  private selfGrantableRoles: Repository<SelfGrantableRole>;

  constructor(guildId) {
    super(guildId);
    this.selfGrantableRoles = getRepository(SelfGrantableRole);
  }

  async getForChannel(channelId: string): Promise<SelfGrantableRole[]> {
    return this.selfGrantableRoles.find({
      where: {
        guild_id: this.guildId,
        channel_id: channelId,
      },
    });
  }

  async delete(channelId: string, roleId: string) {
    await this.selfGrantableRoles.delete({
      guild_id: this.guildId,
      channel_id: channelId,
      role_id: roleId,
    });
  }

  async add(channelId: string, roleId: string, aliases: string[]) {
    await this.selfGrantableRoles.insert({
      guild_id: this.guildId,
      channel_id: channelId,
      role_id: roleId,
      aliases,
    });
  }
}
