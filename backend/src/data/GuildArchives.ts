import { Guild, Snowflake } from "discord.js";
import moment from "moment-timezone";
import { isDefaultSticker } from "src/utils/isDefaultSticker";
import { getRepository, Repository } from "typeorm";
import { renderTemplate, TemplateSafeValueContainer } from "../templateFormatter";
import { trimLines } from "../utils";
import { decrypt, encrypt } from "../utils/crypt";
import { channelToTemplateSafeChannel, guildToTemplateSafeGuild } from "../utils/templateSafeObjects";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { ArchiveEntry } from "./entities/ArchiveEntry";
import { SavedMessage } from "./entities/SavedMessage";

const DEFAULT_EXPIRY_DAYS = 30;

const MESSAGE_ARCHIVE_HEADER_FORMAT = trimLines(`
  Server: {guild.name} ({guild.id})
`);
const MESSAGE_ARCHIVE_MESSAGE_FORMAT =
  "[#{channel.name}] [{user.id}] [{timestamp}] {user.username}#{user.discriminator}: {content}{attachments}{stickers}";

export class GuildArchives extends BaseGuildRepository<ArchiveEntry> {
  protected archives: Repository<ArchiveEntry>;

  constructor(guildId) {
    super(guildId);
    this.archives = getRepository(ArchiveEntry);
  }

  protected async _processEntityFromDB(entity: ArchiveEntry | undefined) {
    if (entity == null) {
      return entity;
    }

    entity.body = await decrypt(entity.body);
    return entity;
  }

  protected async _processEntityToDB(entity: Partial<ArchiveEntry>) {
    if (entity.body) {
      entity.body = await encrypt(entity.body);
    }
    return entity;
  }

  async find(id: string): Promise<ArchiveEntry | undefined> {
    const result = await this.archives.findOne({
      where: { id },
      relations: this.getRelations(),
    });
    return this.processEntityFromDB(result);
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
   * @return - ID of the created archive
   */
  async create(body: string, expiresAt?: moment.Moment): Promise<string> {
    if (!expiresAt) {
      expiresAt = moment.utc().add(DEFAULT_EXPIRY_DAYS, "days");
    }

    const data = await this.processEntityToDB({
      guild_id: this.guildId,
      body,
      expires_at: expiresAt.format("YYYY-MM-DD HH:mm:ss"),
    });
    const result = await this.archives.insert(data);

    return result.identifiers[0].id;
  }

  protected async renderLinesFromSavedMessages(savedMessages: SavedMessage[], guild: Guild): Promise<string[]> {
    const msgLines: string[] = [];
    for (const msg of savedMessages) {
      const channel = guild.channels.cache.get(msg.channel_id as Snowflake);
      const partialUser = new TemplateSafeValueContainer({ ...msg.data.author, id: msg.user_id });

      const line = await renderTemplate(
        MESSAGE_ARCHIVE_MESSAGE_FORMAT,
        new TemplateSafeValueContainer({
          id: msg.id,
          timestamp: moment.utc(msg.posted_at).format("YYYY-MM-DD HH:mm:ss"),
          content: msg.data.content,
          attachments: msg.data.attachments?.map((att) => {
            return JSON.stringify({ name: att.name, url: att.url, type: att.contentType });
          }),
          stickers: msg.data.stickers?.map((sti) => {
            return JSON.stringify({ name: sti.name, id: sti.id, isDefault: isDefaultSticker(sti.id) });
          }),
          user: partialUser,
          channel: channel ? channelToTemplateSafeChannel(channel) : null,
        }),
      );

      msgLines.push(line);
    }
    return msgLines;
  }

  /**
   * @return - ID of the created archive
   */
  async createFromSavedMessages(
    savedMessages: SavedMessage[],
    guild: Guild,
    expiresAt?: moment.Moment,
  ): Promise<string> {
    if (expiresAt == null) {
      expiresAt = moment.utc().add(DEFAULT_EXPIRY_DAYS, "days");
    }

    const headerStr = await renderTemplate(
      MESSAGE_ARCHIVE_HEADER_FORMAT,
      new TemplateSafeValueContainer({
        guild: guildToTemplateSafeGuild(guild),
      }),
    );
    const msgLines = await this.renderLinesFromSavedMessages(savedMessages, guild);
    const messagesStr = msgLines.join("\n");

    return this.create([headerStr, messagesStr].join("\n\n"), expiresAt);
  }

  async addSavedMessagesToArchive(archiveId: string, savedMessages: SavedMessage[], guild: Guild) {
    const msgLines = await this.renderLinesFromSavedMessages(savedMessages, guild);
    const messagesStr = msgLines.join("\n");

    let archive = await this.find(archiveId);
    if (archive == null) {
      throw new Error("Archive not found");
    }

    archive.body += "\n" + messagesStr;
    archive = await this.processEntityToDB(archive);

    await this.archives.update({ id: archiveId }, { body: archive.body });
  }

  getUrl(baseUrl, archiveId) {
    return baseUrl ? `${baseUrl}/archives/${archiveId}` : `Archive ID: ${archiveId}`;
  }
}
