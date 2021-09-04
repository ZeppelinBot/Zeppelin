import { GuildChannel, Message } from "discord.js";
import moment from "moment-timezone";
import { getRepository, Repository } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { isAPI } from "../globals";
import { QueuedEventEmitter } from "../QueuedEventEmitter";
import { MINUTES, SECONDS } from "../utils";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { cleanupMessages } from "./cleanup/messages";
import { ISavedMessageData, SavedMessage } from "./entities/SavedMessage";

if (!isAPI()) {
  const CLEANUP_INTERVAL = 5 * MINUTES;

  async function cleanup() {
    await cleanupMessages();
    setTimeout(cleanup, CLEANUP_INTERVAL);
  }

  // Start first cleanup 30 seconds after startup
  setTimeout(cleanup, 30 * SECONDS);
}

export class GuildSavedMessages extends BaseGuildRepository {
  private messages: Repository<SavedMessage>;
  protected toBePermanent: Set<string>;

  public events: QueuedEventEmitter;

  constructor(guildId) {
    super(guildId);
    this.messages = getRepository(SavedMessage);
    this.events = new QueuedEventEmitter();

    this.toBePermanent = new Set();
  }

  public msgToSavedMessageData(msg: Message): ISavedMessageData {
    const data: ISavedMessageData = {
      author: {
        username: msg.author.username,
        discriminator: msg.author.discriminator,
      },
      content: msg.content,
      timestamp: msg.createdTimestamp,
    };

    if (msg.attachments.size) {
      data.attachments = Array.from(msg.attachments.values()).map(att => ({
        id: att.id,
        contentType: att.contentType,
        name: att.name,
        proxyURL: att.proxyURL,
        size: att.size,
        spoiler: att.spoiler,
        url: att.url,
        width: att.width,
      }));
    }

    if (msg.embeds.length) {
      data.embeds = msg.embeds.map(embed => ({
        title: embed.title,
        description: embed.description,
        url: embed.url,
        timestamp: embed.timestamp,
        color: embed.color,

        fields: embed.fields.map(field => ({
          name: field.name,
          value: field.value,
          inline: field.inline,
        })),

        author: embed.author
          ? {
              name: embed.author.name,
              url: embed.author.url,
              iconURL: embed.author.iconURL,
              proxyIconURL: embed.author.proxyIconURL,
            }
          : undefined,

        thumbnail: embed.thumbnail
          ? {
              url: embed.thumbnail.url,
              proxyURL: embed.thumbnail.proxyURL,
              height: embed.thumbnail.height,
              width: embed.thumbnail.width,
            }
          : undefined,

        image: embed.image
          ? {
              url: embed.image.url,
              proxyURL: embed.image.proxyURL,
              height: embed.image.height,
              width: embed.image.width,
            }
          : undefined,

        video: embed.video
          ? {
              url: embed.video.url,
              proxyURL: embed.video.proxyURL,
              height: embed.video.height,
              width: embed.video.width,
            }
          : undefined,

        footer: embed.footer
          ? {
              text: embed.footer.text,
              iconURL: embed.footer.iconURL,
              proxyIconURL: embed.footer.proxyIconURL,
            }
          : undefined,
      }));
    }

    if (msg.stickers?.size) {
      data.stickers = Array.from(msg.stickers.values()).map(sticker => ({
        format: sticker.format,
        guildId: sticker.guildId,
        id: sticker.id,
        name: sticker.name,
        description: sticker.description,
        available: sticker.available,
        type: sticker.type,
      }));
    }

    return data;
  }

  find(id) {
    return this.messages
      .createQueryBuilder()
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("id = :id", { id })
      .andWhere("deleted_at IS NULL")
      .getOne();
  }

  getLatestBotMessagesByChannel(channelId, limit) {
    return this.messages
      .createQueryBuilder()
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("channel_id = :channel_id", { channel_id: channelId })
      .andWhere("is_bot = 1")
      .andWhere("deleted_at IS NULL")
      .orderBy("id", "DESC")
      .limit(limit)
      .getMany();
  }

  getLatestByChannelBeforeId(channelId, beforeId, limit) {
    return this.messages
      .createQueryBuilder()
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("channel_id = :channel_id", { channel_id: channelId })
      .andWhere("id < :beforeId", { beforeId })
      .andWhere("deleted_at IS NULL")
      .orderBy("id", "DESC")
      .limit(limit)
      .getMany();
  }

  getLatestByChannelAndUser(channelId, userId, limit) {
    return this.messages
      .createQueryBuilder()
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("channel_id = :channel_id", { channel_id: channelId })
      .andWhere("user_id = :user_id", { user_id: userId })
      .andWhere("deleted_at IS NULL")
      .orderBy("id", "DESC")
      .limit(limit)
      .getMany();
  }

  getUserMessagesByChannelAfterId(userId, channelId, afterId, limit?: number) {
    let query = this.messages
      .createQueryBuilder()
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("channel_id = :channel_id", { channel_id: channelId })
      .andWhere("user_id = :user_id", { user_id: userId })
      .andWhere("id > :afterId", { afterId })
      .andWhere("deleted_at IS NULL");

    if (limit != null) {
      query = query.limit(limit);
    }

    return query.getMany();
  }

  getMultiple(messageIds: string[]): Promise<SavedMessage[]> {
    return this.messages
      .createQueryBuilder()
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("id IN (:messageIds)", { messageIds })
      .getMany();
  }

  async create(data) {
    const isPermanent = this.toBePermanent.has(data.id);
    if (isPermanent) {
      data.is_permanent = true;
      this.toBePermanent.delete(data.id);
    }

    try {
      await this.messages.insert(data);
    } catch (e) {
      if (e?.code === "ER_DUP_ENTRY") {
        console.trace(`Tried to insert duplicate message ID: ${data.id}`);
        return;
      }

      throw e;
    }

    const inserted = await this.messages.findOne(data.id);
    this.events.emit("create", [inserted]);
    this.events.emit(`create:${data.id}`, [inserted]);
  }

  async createFromMsg(msg: Message, overrides = {}) {
    // FIXME: Hotfix
    if (!msg.channel) {
      return;
    }

    const savedMessageData = this.msgToSavedMessageData(msg);
    const postedAt = moment.utc(msg.createdTimestamp, "x").format("YYYY-MM-DD HH:mm:ss");

    const data = {
      id: msg.id,
      guild_id: (msg.channel as GuildChannel).guild.id,
      channel_id: msg.channel.id,
      user_id: msg.author.id,
      is_bot: msg.author.bot,
      data: savedMessageData,
      posted_at: postedAt,
    };

    return this.create({ ...data, ...overrides });
  }

  async createFromMessages(messages: Message[], overrides = {}) {
    for (const msg of messages) {
      await this.createFromMsg(msg, overrides);
    }
  }

  async markAsDeleted(id) {
    await this.messages
      .createQueryBuilder("messages")
      .update()
      .set({
        deleted_at: () => "NOW(3)",
      })
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("id = :id", { id })
      .execute();

    const deleted = await this.messages.findOne(id);

    if (deleted) {
      this.events.emit("delete", [deleted]);
      this.events.emit(`delete:${id}`, [deleted]);
    }
  }

  /**
   * Marks the specified messages as deleted in the database (if they weren't already marked before).
   * If any messages were marked as deleted, also emits the deleteBulk event.
   */
  async markBulkAsDeleted(ids) {
    const deletedAt = moment.utc().format("YYYY-MM-DD HH:mm:ss");

    await this.messages
      .createQueryBuilder()
      .update()
      .set({ deleted_at: deletedAt })
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("id IN (:ids)", { ids })
      .andWhere("deleted_at IS NULL")
      .execute();

    const deleted = await this.messages
      .createQueryBuilder()
      .where("id IN (:ids)", { ids })
      .andWhere("deleted_at = :deletedAt", { deletedAt })
      .getMany();

    if (deleted.length) {
      this.events.emit("deleteBulk", [deleted]);
    }
  }

  async saveEdit(id, newData: ISavedMessageData) {
    const oldMessage = await this.messages.findOne(id);
    if (!oldMessage) return;

    const newMessage = { ...oldMessage, data: newData };

    // @ts-ignore
    await this.messages.update(
      // FIXME?
      { id },
      {
        data: newData as QueryDeepPartialEntity<ISavedMessageData>,
      },
    );

    this.events.emit("update", [newMessage, oldMessage]);
    this.events.emit(`update:${id}`, [newMessage, oldMessage]);
  }

  async saveEditFromMsg(msg: Message) {
    const newData = this.msgToSavedMessageData(msg);
    return this.saveEdit(msg.id, newData);
  }

  async setPermanent(id: string) {
    const savedMsg = await this.find(id);
    if (savedMsg) {
      await this.messages.update(
        { id },
        {
          is_permanent: true,
        },
      );
    } else {
      this.toBePermanent.add(id);
    }
  }

  async onceMessageAvailable(id: string, handler: (msg?: SavedMessage) => any, timeout: number = 60 * 1000) {
    let called = false;
    let onceEventListener;
    let timeoutFn;

    const callHandler = async (msg?: SavedMessage) => {
      this.events.off(`create:${id}`, onceEventListener);
      clearTimeout(timeoutFn);

      if (called) return;
      called = true;

      await handler(msg);
    };

    onceEventListener = this.events.once(`create:${id}`, callHandler);
    timeoutFn = setTimeout(() => {
      called = true;
      callHandler(undefined);
    }, timeout);

    const messageInDB = await this.find(id);
    if (messageInDB) {
      callHandler(messageInDB);
    }
  }
}
