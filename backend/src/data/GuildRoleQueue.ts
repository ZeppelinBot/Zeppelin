import { getRepository, Repository } from "typeorm";
import { Reminder } from "./entities/Reminder";
import { BaseRepository } from "./BaseRepository";
import moment from "moment-timezone";
import { DBDateFormat } from "../utils";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { RoleQueueItem } from "./entities/RoleQueueItem";
import { connection } from "./db";

export class GuildRoleQueue extends BaseGuildRepository {
  private roleQueue: Repository<RoleQueueItem>;

  constructor(guildId) {
    super(guildId);
    this.roleQueue = getRepository(RoleQueueItem);
  }

  consumeNextRoleAssignments(count: number): Promise<RoleQueueItem[]> {
    return connection.transaction(async (entityManager) => {
      const repository = entityManager.getRepository(RoleQueueItem);

      const nextAssignments = await repository
        .createQueryBuilder()
        .where("guild_id = :guildId", { guildId: this.guildId })
        .addOrderBy("priority", "DESC")
        .addOrderBy("id", "ASC")
        .take(count)
        .getMany();

      if (nextAssignments.length > 0) {
        const ids = nextAssignments.map((assignment) => assignment.id);
        await repository.createQueryBuilder().where("id IN (:ids)", { ids }).delete().execute();
      }

      return nextAssignments;
    });
  }

  async addQueueItem(userId: string, roleId: string, shouldAdd: boolean, priority = 0) {
    await this.roleQueue.insert({
      guild_id: this.guildId,
      user_id: userId,
      role_id: roleId,
      should_add: shouldAdd,
      priority,
    });
  }
}
