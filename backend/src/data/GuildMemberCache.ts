import moment from "moment-timezone";
import { Repository } from "typeorm";
import { Blocker } from "../Blocker.js";
import { DBDateFormat, MINUTES } from "../utils.js";
import { BaseGuildRepository } from "./BaseGuildRepository.js";
import { dataSource } from "./dataSource.js";
import { MemberCacheItem } from "./entities/MemberCacheItem.js";

const SAVE_PENDING_BLOCKER_KEY = "save-pending" as const;

const DELETION_DELAY = 5 * MINUTES;

type UpdateData = Pick<MemberCacheItem, "username" | "nickname" | "roles">;

export class GuildMemberCache extends BaseGuildRepository {
  #memberCache: Repository<MemberCacheItem>;

  #pendingUpdates: Map<string, Partial<MemberCacheItem>>;

  #blocker: Blocker;

  constructor(guildId: string) {
    super(guildId);
    this.#memberCache = dataSource.getRepository(MemberCacheItem);
    this.#pendingUpdates = new Map();
    this.#blocker = new Blocker();
  }

  async savePendingUpdates(): Promise<void> {
    await this.#blocker.waitToBeUnblocked(SAVE_PENDING_BLOCKER_KEY);

    if (this.#pendingUpdates.size === 0) {
      return;
    }

    this.#blocker.block(SAVE_PENDING_BLOCKER_KEY);

    const entitiesToSave = Array.from(this.#pendingUpdates.values());
    this.#pendingUpdates.clear();

    await this.#memberCache.upsert(entitiesToSave, ["guild_id", "user_id"]).finally(() => {
      this.#blocker.unblock(SAVE_PENDING_BLOCKER_KEY);
    });
  }

  async getCachedMemberData(userId: string): Promise<MemberCacheItem | null> {
    await this.#blocker.waitToBeUnblocked(SAVE_PENDING_BLOCKER_KEY);

    const dbItem = await this.#memberCache.findOne({
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
    });
    const pendingItem = this.#pendingUpdates.get(userId);
    if (!dbItem && !pendingItem) {
      return null;
    }

    const item = new MemberCacheItem();
    Object.assign(item, dbItem ?? {});
    Object.assign(item, pendingItem ?? {});
    return item;
  }

  async setCachedMemberData(userId: string, data: UpdateData): Promise<void> {
    await this.#blocker.waitToBeUnblocked(SAVE_PENDING_BLOCKER_KEY);

    if (!this.#pendingUpdates.has(userId)) {
      const newItem = new MemberCacheItem();
      newItem.guild_id = this.guildId;
      newItem.user_id = userId;
      this.#pendingUpdates.set(userId, newItem);
    }
    Object.assign(this.#pendingUpdates.get(userId)!, data);
    this.#pendingUpdates.get(userId)!.last_seen = moment().format("YYYY-MM-DD");
  }

  async markMemberForDeletion(userId: string): Promise<void> {
    await this.#memberCache.update(
      {
        guild_id: this.guildId,
        user_id: userId,
      },
      {
        delete_at: moment().add(DELETION_DELAY, "ms").format(DBDateFormat),
      },
    );
  }

  async unmarkMemberForDeletion(userId: string): Promise<void> {
    await this.#memberCache.update(
      {
        guild_id: this.guildId,
        user_id: userId,
      },
      {
        delete_at: null,
      },
    );
  }
}
