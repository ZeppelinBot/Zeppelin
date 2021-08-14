import { ApiPermissions } from "@shared/apiPermissions";
import { getRepository, Repository } from "typeorm";
import { BaseRepository } from "./BaseRepository";
import { ApiPermissionAssignment } from "./entities/ApiPermissionAssignment";

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

  getByGuildId(guildId) {
    return this.apiPermissions.find({
      where: {
        guild_id: guildId,
      },
    });
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

  addUser(guildId, userId, permissions: ApiPermissions[]) {
    return this.apiPermissions.insert({
      guild_id: guildId,
      type: ApiPermissionTypes.User,
      target_id: userId,
      permissions,
    });
  }

  removeUser(guildId, userId) {
    return this.apiPermissions.delete({ guild_id: guildId, type: ApiPermissionTypes.User, target_id: userId });
  }
}
