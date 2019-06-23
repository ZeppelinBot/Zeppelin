import { getRepository, Repository } from "typeorm";
import { ApiPermission } from "./entities/ApiPermission";
import { BaseRepository } from "./BaseRepository";

export class ApiPermissions extends BaseRepository {
  private apiPermissions: Repository<ApiPermission>;

  constructor() {
    super();
    this.apiPermissions = getRepository(ApiPermission);
  }

  getByGuildAndUserId(guildId, userId) {
    return this.apiPermissions.findOne({
      where: {
        guild_id: guildId,
        user_id: userId,
      },
    });
  }
}
