import { getRepository, Repository } from "typeorm";
import { ApiPermissionTypes } from "./ApiPermissionAssignments";
import { BaseRepository } from "./BaseRepository";
import { AllowedGuild } from "./entities/AllowedGuild";

export class AllowedGuilds extends BaseRepository {
  private allowedGuilds: Repository<AllowedGuild>;

  constructor() {
    super();
    this.allowedGuilds = getRepository(AllowedGuild);
  }

  async isAllowed(guildId) {
    const count = await this.allowedGuilds.count({
      where: {
        id: guildId,
      },
    });
    return count !== 0;
  }

  find(guildId) {
    return this.allowedGuilds.findOne(guildId);
  }

  getForApiUser(userId) {
    return this.allowedGuilds
      .createQueryBuilder("allowed_guilds")
      .innerJoin(
        "api_permissions",
        "api_permissions",
        "api_permissions.guild_id = allowed_guilds.id AND api_permissions.type = :type AND api_permissions.target_id = :userId",
        { type: ApiPermissionTypes.User, userId },
      )
      .getMany();
  }

  updateInfo(id, name, icon, ownerId) {
    return this.allowedGuilds.update({ id }, { name, icon, owner_id: ownerId });
  }

  add(id, data: Partial<Omit<AllowedGuild, "id">> = {}) {
    return this.allowedGuilds.insert({
      name: "Server",
      icon: null,
      owner_id: "0",
      ...data,
      id,
    });
  }

  remove(id) {
    return this.allowedGuilds.delete({ id });
  }
}
