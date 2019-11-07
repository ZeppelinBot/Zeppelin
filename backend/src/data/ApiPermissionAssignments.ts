import { getRepository, Repository } from "typeorm";
import { ApiPermissionAssignment } from "./entities/ApiPermissionAssignment";
import { BaseRepository } from "./BaseRepository";

export enum ApiPermissionTypes {
  User = "USER",
  Role = "ROLE",
}

export class ApiPermissionAssignments extends BaseRepository {
  private apiPermissions: Repository<ApiPermissionAssignment>;

  constructor() {
    super();
    this.apiPermissions = getRepository(ApiPermissionAssignment);
  }

  getByUserId(userId) {
    return this.apiPermissions.find({
      where: {
        type: ApiPermissionTypes.User,
        target_id: userId,
      },
    });
  }

  getByGuildAndUserId(guildId, userId) {
    return this.apiPermissions.findOne({
      where: {
        guild_id: guildId,
        type: ApiPermissionTypes.User,
        target_id: userId,
      },
    });
  }
}
