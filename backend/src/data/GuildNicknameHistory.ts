import { getRepository, In, Repository } from "typeorm";
import { isAPI } from "../globals";
import { MINUTES, SECONDS } from "../utils";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { cleanupNicknames } from "./cleanup/nicknames";
import { NicknameHistoryEntry } from "./entities/NicknameHistoryEntry";

if (!isAPI()) {
  const CLEANUP_INTERVAL = 5 * MINUTES;

  async function cleanup() {
    await cleanupNicknames();
    setTimeout(cleanup, CLEANUP_INTERVAL);
  }

  // Start first cleanup 30 seconds after startup
  setTimeout(cleanup, 30 * SECONDS);
}

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

  getLastEntry(userId): Promise<NicknameHistoryEntry | undefined> {
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

    // Cleanup (leave only the last MAX_USERNAME_ENTRIES_PER_USER entries)
    const toDelete = await this.nicknameHistory
      .createQueryBuilder()
      .where("guild_id = :guildId", { guildId: this.guildId })
      .andWhere("user_id = :userId", { userId })
      .orderBy("id", "DESC")
      .skip(MAX_NICKNAME_ENTRIES_PER_USER)
      .take(99_999)
      .getMany();

    if (toDelete.length > 0) {
      await this.nicknameHistory.delete({
        id: In(toDelete.map(v => v.id)),
      });
    }
  }
}
