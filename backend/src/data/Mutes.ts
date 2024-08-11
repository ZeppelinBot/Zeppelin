import moment from "moment-timezone";
import { Repository } from "typeorm";
import { DAYS, DBDateFormat } from "../utils.js";
import { BaseRepository } from "./BaseRepository.js";
import { MuteTypes } from "./MuteTypes.js";
import { dataSource } from "./dataSource.js";
import { Mute } from "./entities/Mute.js";

const OLD_EXPIRED_MUTE_THRESHOLD = 7 * DAYS;

export const MAX_TIMEOUT_DURATION = 27 * DAYS;
// When a timeout is under this duration but the mute expires later, the timeout will be reset to max duration
export const TIMEOUT_RENEWAL_THRESHOLD = 21 * DAYS;

export class Mutes extends BaseRepository {
  private mutes: Repository<Mute>;

  constructor() {
    super();
    this.mutes = dataSource.getRepository(Mute);
  }

  findMute(guildId: string, userId: string): Promise<Mute | null> {
    return this.mutes.findOne({
      where: {
        guild_id: guildId,
        user_id: userId,
      },
    });
  }

  getSoonExpiringMutes(threshold: number): Promise<Mute[]> {
    const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    return this.mutes
      .createQueryBuilder("mutes")
      .andWhere("expires_at IS NOT NULL")
      .andWhere("expires_at <= :date", { date: thresholdDateStr })
      .getMany();
  }

  getTimeoutMutesToRenew(threshold: number): Promise<Mute[]> {
    const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    return this.mutes
      .createQueryBuilder("mutes")
      .andWhere("type = :type", { type: MuteTypes.Timeout })
      .andWhere("(expires_at IS NULL OR timeout_expires_at < expires_at)")
      .andWhere("timeout_expires_at <= :date", { date: thresholdDateStr })
      .getMany();
  }

  async clearOldExpiredMutes(): Promise<void> {
    const thresholdDateStr = moment.utc().subtract(OLD_EXPIRED_MUTE_THRESHOLD, "ms").format(DBDateFormat);
    await this.mutes
      .createQueryBuilder("mutes")
      .andWhere("expires_at IS NOT NULL")
      .andWhere("expires_at <= :date", { date: thresholdDateStr })
      .delete()
      .execute();
  }
}
