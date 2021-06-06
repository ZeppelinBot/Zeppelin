import { getRepository, In, Repository } from "typeorm";
import { isAPI } from "../globals";
import { MINUTES, SECONDS } from "../utils";
import { BaseRepository } from "./BaseRepository";
import { cleanupUsernames } from "./cleanup/usernames";
import { UsernameHistoryEntry } from "./entities/UsernameHistoryEntry";

if (!isAPI()) {
  const CLEANUP_INTERVAL = 5 * MINUTES;

  async function cleanup() {
    await cleanupUsernames();
    setTimeout(cleanup, CLEANUP_INTERVAL);
  }

  // Start first cleanup 30 seconds after startup
  setTimeout(cleanup, 30 * SECONDS);
}

export const MAX_USERNAME_ENTRIES_PER_USER = 5;

export class UsernameHistory extends BaseRepository {
  private usernameHistory: Repository<UsernameHistoryEntry>;

  constructor() {
    super();
    this.usernameHistory = getRepository(UsernameHistoryEntry);
  }

  async getByUserId(userId): Promise<UsernameHistoryEntry[]> {
    return this.usernameHistory.find({
      where: {
        user_id: userId,
      },
      order: {
        id: "DESC",
      },
      take: MAX_USERNAME_ENTRIES_PER_USER,
    });
  }

  getLastEntry(userId): Promise<UsernameHistoryEntry | undefined> {
    return this.usernameHistory.findOne({
      where: {
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
    const toDelete = await this.usernameHistory
      .createQueryBuilder()
      .where("user_id = :userId", { userId })
      .orderBy("id", "DESC")
      .skip(MAX_USERNAME_ENTRIES_PER_USER)
      .take(99_999)
      .getMany();

    if (toDelete.length > 0) {
      await this.usernameHistory.delete({
        id: In(toDelete.map(v => v.id)),
      });
    }
  }
}
