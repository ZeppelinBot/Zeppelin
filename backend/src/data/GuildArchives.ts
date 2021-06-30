import { Guild, Snowflake } from "discord.js";
import moment from "moment-timezone";
import { getRepository, Repository } from "typeorm";
import { renderTemplate } from "../templateFormatter";
import { trimLines } from "../utils";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { ArchiveEntry } from "./entities/ArchiveEntry";
import { SavedMessage } from "./entities/SavedMessage";

const DEFAULT_EXPIRY_DAYS = 30;

const MESSAGE_ARCHIVE_HEADER_FORMAT = trimLines(`
  Server: {guild.name} ({guild.id})
`);
const MESSAGE_ARCHIVE_MESSAGE_FORMAT =
  "[#{channel.name}] [{user.id}] [{timestamp}] {user.username}#{user.discriminator}: {content}{attachments}";

export class GuildArchives extends BaseGuildRepository {
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

  async find(id: string): Promise<ArchiveEntry | undefined> {
    return this.archives.findOne({
      where: { id },
      relations: this.getRelations(),
    });
  }

  async makePermanent(id: string): Promise<void> {
    await this.archives.update(
      { id },
      {
        expires_at: null,
      },
    );
  }

  /**
   * @returns ID of the created entry
   */
  async create(body: string, expiresAt?: moment.Moment): Promise<string> {
    if (!expiresAt) {
      expiresAt = moment.utc().add(DEFAULT_EXPIRY_DAYS, "days");
    }

    const result = await this.archives.insert({
      guild_id: this.guildId,
      body,
      expires_at: expiresAt.format("YYYY-MM-DD HH:mm:ss"),
    });

    return result.identifiers[0].id;
  }

  protected async renderLinesFromSavedMessages(savedMessages: SavedMessage[], guild: Guild) {
    const msgLines: string[] = [];
    for (const msg of savedMessages) {
      const channel = guild.channels.cache.get(msg.channel_id as Snowflake);
      const user = { ...msg.data.author, id: msg.user_id };

      const line = await renderTemplate(MESSAGE_ARCHIVE_MESSAGE_FORMAT, {
        id: msg.id,
        timestamp: moment.utc(msg.posted_at).format("YYYY-MM-DD HH:mm:ss"),
        content: msg.data.content,
        user,
        channel,
      });
      msgLines.push(line);
    }
    return msgLines;
  }

  async createFromSavedMessages(savedMessages: SavedMessage[], guild: Guild, expiresAt?: moment.Moment) {
    if (expiresAt == null) {
      expiresAt = moment.utc().add(DEFAULT_EXPIRY_DAYS, "days");
    }

    const headerStr = await renderTemplate(MESSAGE_ARCHIVE_HEADER_FORMAT, { guild });
    const msgLines = await this.renderLinesFromSavedMessages(savedMessages, guild);
    const messagesStr = msgLines.join("\n");

    return this.create([headerStr, messagesStr].join("\n\n"), expiresAt);
  }

  async addSavedMessagesToArchive(archiveId: string, savedMessages: SavedMessage[], guild: Guild) {
    const msgLines = await this.renderLinesFromSavedMessages(savedMessages, guild);
    const messagesStr = msgLines.join("\n");

    const archive = await this.find(archiveId);
    if (archive == null) {
      throw new Error("Archive not found");
    }

    archive.body += "\n" + messagesStr;

    await this.archives.update({ id: archiveId }, { body: archive.body });
  }

  getUrl(baseUrl, archiveId) {
    return baseUrl ? `${baseUrl}/archives/${archiveId}` : `Archive ID: ${archiveId}`;
  }
}
