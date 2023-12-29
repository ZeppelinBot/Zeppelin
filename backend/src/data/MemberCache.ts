import moment from "moment-timezone";
import { Repository } from "typeorm";
import { DAYS } from "../utils";
import { BaseRepository } from "./BaseRepository";
import { dataSource } from "./dataSource";
import { MemberCacheItem } from "./entities/MemberCacheItem";

const STALE_PERIOD = 90 * DAYS;

export class MemberCache extends BaseRepository {
  #memberCache: Repository<MemberCacheItem>;

  constructor() {
    super();
    this.#memberCache = dataSource.getRepository(MemberCacheItem);
  }

  async deleteStaleData(): Promise<void> {
    const cutoff = moment().subtract(STALE_PERIOD, "ms").format("YYYY-MM-DD");
    await this.#memberCache.createQueryBuilder().where("last_seen < :cutoff", { cutoff }).delete().execute();
  }

  async deleteMarkedToBeDeletedEntries(): Promise<void> {
    await this.#memberCache
      .createQueryBuilder()
      .where("delete_at IS NOT NULL AND delete_at <= NOW()")
      .delete()
      .execute();
  }
}
