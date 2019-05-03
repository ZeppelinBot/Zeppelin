import { BaseRepository } from "./BaseRepository";
import { getRepository, Repository } from "typeorm";
import { UsernameHistoryEntry } from "./entities/UsernameHistoryEntry";
import { sorter } from "../utils";

export const MAX_USERNAME_ENTRIES_PER_USER = 10;

export class UsernameHistory extends BaseRepository {
  private usernameHistory: Repository<UsernameHistoryEntry>;

  constructor(guildId) {
    super(guildId);
    this.usernameHistory = getRepository(UsernameHistoryEntry);
  }

  async getByUserId(userId): Promise<UsernameHistoryEntry[]> {
    return this.usernameHistory.find({
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
      order: {
        id: "DESC",
      },
      take: MAX_USERNAME_ENTRIES_PER_USER,
    });
  }

  getLastEntry(userId): Promise<UsernameHistoryEntry> {
    return this.usernameHistory.findOne({
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
      order: {
        id: "DESC",
      },
    });
  }

  async addEntry(userId, username) {
    await this.usernameHistory.insert({
      user_id: userId,
      username,
    });

    // Cleanup (leave only the last MAX_USERNAME_ENTRIES_PER_USER entries)
    const lastEntries = await this.getByUserId(userId);
    if (lastEntries.length > MAX_USERNAME_ENTRIES_PER_USER) {
      const earliestEntry = lastEntries
        .sort(sorter("timestamp", "DESC"))
        .slice(0, 10)
        .reduce((earliest, entry) => {
          if (earliest == null) return entry;
          if (entry.id < earliest.id) return entry;
          return earliest;
        }, null);

      this.usernameHistory
        .createQueryBuilder()
        .andWhere("user_id = :userId", { userId })
        .andWhere("id < :id", { id: earliestEntry.id })
        .delete()
        .execute();
    }
  }
}
