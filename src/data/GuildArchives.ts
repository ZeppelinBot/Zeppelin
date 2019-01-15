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
`);
const MESSAGE_ARCHIVE_MESSAGE_FORMAT =
  "[#{channel.name}] [{user.id}] [{timestamp}] {user.username}#{user.discriminator}: {content}{attachments}";

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
      .andWhere("expires_at IS NOT NULL")
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

  async makePermanent(id: string): Promise<void> {
    await this.archives.update(
      { id },
      {
        expires_at: null
      }
    );
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

  createFromSavedMessages(savedMessages: SavedMessage[], guild: Guild, expiresAt = null) {
    if (expiresAt == null) expiresAt = moment().add(DEFAULT_EXPIRY_DAYS, "days");

    const headerStr = formatTemplateString(MESSAGE_ARCHIVE_HEADER_FORMAT, { guild });
    const msgLines = savedMessages.map(msg => {
      const channel = guild.channels.get(msg.channel_id);
      const user = { ...msg.data.author, id: msg.user_id };

      return formatTemplateString(MESSAGE_ARCHIVE_MESSAGE_FORMAT, {
        id: msg.id,
        timestamp: moment(msg.posted_at).format("YYYY-MM-DD HH:mm:ss"),
        content: msg.data.content,
        user,
        channel
      });
    });
    const messagesStr = msgLines.join("\n");

    return this.create([headerStr, messagesStr].join("\n\n"), expiresAt);
  }

  getUrl(baseUrl, archiveId) {
    return baseUrl ? `${baseUrl}/archives/${archiveId}` : `Archive ID: ${archiveId}`;
  }
}
