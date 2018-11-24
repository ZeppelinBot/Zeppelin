import uuid from "uuid/v4"; // tslint:disable-line
import moment from "moment-timezone";
import { ArchiveEntry } from "./entities/ArchiveEntry";
import { getRepository, Repository } from "typeorm";
import { BaseRepository } from "./BaseRepository";
import { formatTemplateString, trimLines } from "../utils";
import { SavedMessage } from "./entities/SavedMessage";
import { Channel, Guild, User } from "eris";

const DEFAULT_EXPIRY_DAYS = 30;

const MESSAGE_ARCHIVE_HEADER_FORMAT = trimLines(`
  Server: {guild.name} ({guild.id})
  Channel: #{channel.name} ({channel.id})
  User: {user.username}#{user.discriminator} ({user.id})
`);
const MESSAGE_ARCHIVE_MESSAGE_FORMAT = "[MSG ID {id}] [{timestamp}] {user.username}: {content}{attachments}";
const MESSAGE_ARCHIVE_FOOTER_FORMAT = trimLines(`
  Log file generated on {timestamp}
  Expires at {expires}
`);

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
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("expires_at <= NOW()")
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

  createFromSavedMessages(
    savedMessages: SavedMessage[],
    guild: Guild,
    channel: Channel = null,
    user: User = null,
    expiresAt = null
  ) {
    if (expiresAt == null) expiresAt = moment().add(DEFAULT_EXPIRY_DAYS, "days");

    const headerStr = formatTemplateString(MESSAGE_ARCHIVE_HEADER_FORMAT, { guild, channel, user });
    const msgLines = savedMessages.map(msg => {
      return formatTemplateString(MESSAGE_ARCHIVE_MESSAGE_FORMAT, {
        id: msg.id,
        timestamp: moment(msg.posted_at).format("HH:mm:ss"),
        content: msg.data.content,
        user
      });
    });
    const messagesStr = msgLines.join("\n");
    const footerStr = formatTemplateString(MESSAGE_ARCHIVE_FOOTER_FORMAT, {
      timestamp: moment().format("YYYY-MM-DD [at] HH:mm:ss (Z)"),
      expires: expiresAt.format("YYYY-MM-DD [at] HH:mm:ss (Z)")
    });

    return this.create([headerStr, messagesStr, footerStr].join("\n\n"), expiresAt);
  }
}
