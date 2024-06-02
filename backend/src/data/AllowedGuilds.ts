import moment from "moment-timezone";
import { Repository } from "typeorm";
import { DBDateFormat } from "../utils.js";
import { ApiPermissionTypes } from "./ApiPermissionAssignments.js";
import { BaseRepository } from "./BaseRepository.js";
import { dataSource } from "./dataSource.js";
import { AllowedGuild } from "./entities/AllowedGuild.js";

export class AllowedGuilds extends BaseRepository {
  private allowedGuilds: Repository<AllowedGuild>;

  constructor() {
    super();
    this.allowedGuilds = dataSource.getRepository(AllowedGuild);
  }

  async isAllowed(guildId: string) {
    const count = await this.allowedGuilds.count({
      where: {
        id: guildId,
      },
    });
    return count !== 0;
  }

  find(guildId: string) {
    return this.allowedGuilds.findOne({
      where: {
        id: guildId,
      },
    });
  }

  getForApiUser(userId: string) {
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
    return this.allowedGuilds.update(
      { id },
      { name, icon, owner_id: ownerId, updated_at: moment.utc().format(DBDateFormat) },
    );
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
