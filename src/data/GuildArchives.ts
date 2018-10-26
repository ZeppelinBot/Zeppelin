import uuid from "uuid/v4"; // tslint:disable-line
import moment from "moment-timezone";
import { ArchiveEntry } from "./entities/ArchiveEntry";
import { getRepository, Repository } from "typeorm";
import { BaseRepository } from "./BaseRepository";

const DEFAULT_EXPIRY_DAYS = 30;

export class GuildArchives extends BaseRepository {
  protected archives: Repository<ArchiveEntry>;

  constructor(guildId) {
    super(guildId);
    this.archives = getRepository(ArchiveEntry);

    // Clean expired archives at start and then every hour
    this.deleteExpiredArchives();
    setInterval(() => this.deleteExpiredArchives(), 1000 * 60 * 60);
  }

  private deleteExpiredArchives() {
    this.archives
      .createQueryBuilder()
      .where("expires_at <= NOW()")
      .delete()
      .execute();
  }

  async find(id: string): Promise<ArchiveEntry> {
    return this.archives.findOne({
      where: { id },
      relations: this.getRelations()
    });
  }

  /**
   * @returns ID of the created entry
   */
  async create(body: string, expiresAt: moment.Moment = null): Promise<string> {
    if (!expiresAt) {
      expiresAt = moment().add(DEFAULT_EXPIRY_DAYS, "days");
    }

    const result = await this.archives.insert({
      guild_id: this.guildId,
      body,
      expires_at: expiresAt.format("YYYY-MM-DD HH:mm:ss")
    });

    return result.identifiers[0].id;
  }
}
