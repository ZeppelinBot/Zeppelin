import { Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository.js";
import { dataSource } from "./dataSource.js";
import { RoleQueueItem } from "./entities/RoleQueueItem.js";

export class GuildRoleQueue extends BaseGuildRepository {
  private roleQueue: Repository<RoleQueueItem>;

  constructor(guildId) {
    super(guildId);
    this.roleQueue = dataSource.getRepository(RoleQueueItem);
  }

  consumeNextRoleAssignments(count: number): Promise<RoleQueueItem[]> {
    return dataSource.transaction(async (entityManager) => {
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
