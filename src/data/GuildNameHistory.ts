import { BaseRepository } from "./BaseRepository";
import { getRepository, Repository } from "typeorm";
import { NameHistoryEntry } from "./entities/NameHistoryEntry";

const MAX_ENTRIES_PER_USER = 10;

export class GuildNameHistory extends BaseRepository {
  private nameHistory: Repository<NameHistoryEntry>;

  constructor(guildId) {
    super(guildId);
    this.nameHistory = getRepository(NameHistoryEntry);
  }

  async getByUserId(userId): Promise<NameHistoryEntry[]> {
    return this.nameHistory.find({
      where: {
        guild_id: this.guildId,
        user_id: userId
      },
      order: {
        id: "DESC"
      },
      take: MAX_ENTRIES_PER_USER
    });
  }

  getLastEntryByType(userId, type): Promise<NameHistoryEntry> {
    return this.nameHistory.findOne({
      where: {
        guild_id: this.guildId,
        user_id: userId,
        type
      },
      order: {
        id: "DESC"
      }
    });
  }

  async addEntry(userId, type, value) {
    await this.nameHistory.insert({
      guild_id: this.guildId,
      user_id: userId,
      type,
      value
    });

    // Cleanup (leave only the last MAX_ENTRIES_PER_USER entries)
    const lastEntries = await this.getByUserId(userId);
    if (lastEntries.length > MAX_ENTRIES_PER_USER) {
      const earliestEntry = lastEntries[lastEntries.length - 1];
      if (!earliestEntry) return;

      this.nameHistory
        .createQueryBuilder()
        .where("guild_id = :guildId", { guildId: this.guildId })
        .andWhere("user_id = :userId", { userId })
        .andWhere("id < :id", { id: earliestEntry.id })
        .delete()
        .execute();
    }
  }
}
