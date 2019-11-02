import { BaseGuildRepository } from "./BaseGuildRepository";
import { getRepository, Repository } from "typeorm";
import { NicknameHistoryEntry } from "./entities/NicknameHistoryEntry";
import { sorter } from "../utils";

export const MAX_NICKNAME_ENTRIES_PER_USER = 10;

export class GuildNicknameHistory extends BaseGuildRepository {
  private nicknameHistory: Repository<NicknameHistoryEntry>;

  constructor(guildId) {
    super(guildId);
    this.nicknameHistory = getRepository(NicknameHistoryEntry);
  }

  async getByUserId(userId): Promise<NicknameHistoryEntry[]> {
    return this.nicknameHistory.find({
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
      order: {
        id: "DESC",
      },
    });
  }

  getLastEntry(userId): Promise<NicknameHistoryEntry> {
    return this.nicknameHistory.findOne({
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
      order: {
        id: "DESC",
      },
    });
  }

  async addEntry(userId, nickname) {
    await this.nicknameHistory.insert({
      guild_id: this.guildId,
      user_id: userId,
      nickname,
    });

    // Cleanup (leave only the last MAX_NICKNAME_ENTRIES_PER_USER entries)
    const lastEntries = await this.getByUserId(userId);
    if (lastEntries.length > MAX_NICKNAME_ENTRIES_PER_USER) {
      const earliestEntry = lastEntries
        .sort(sorter("timestamp", "DESC"))
        .slice(0, 10)
        .reduce((earliest, entry) => {
          if (earliest == null) return entry;
          if (entry.id < earliest.id) return entry;
          return earliest;
        }, null);

      this.nicknameHistory
        .createQueryBuilder()
        .where("guild_id = :guildId", { guildId: this.guildId })
        .andWhere("user_id = :userId", { userId })
        .andWhere("id < :id", { id: earliestEntry.id })
        .delete()
        .execute();
    }
  }
}
