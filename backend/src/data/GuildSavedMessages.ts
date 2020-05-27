import { Brackets, getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { ISavedMessageData, SavedMessage } from "./entities/SavedMessage";
import { QueuedEventEmitter } from "../QueuedEventEmitter";
import { GuildChannel, Message } from "eris";
import moment from "moment-timezone";
import { DAYS, MINUTES } from "../utils";

const CLEANUP_INTERVAL = 5 * MINUTES;

/**
 * How long message edits, deletions, etc. will include the original message content.
 * This is very heavy storage-wise, so keeping it as low as possible is ideal.
 */
const RETENTION_PERIOD = 1 * DAYS;

async function cleanup() {
  const repository = getRepository(SavedMessage);
  await repository
    .createQueryBuilder("messages")
    .where(
      // Clear deleted messages
      new Brackets(qb => {
        qb.where("deleted_at IS NOT NULL");
        qb.andWhere(`deleted_at <= (NOW() - INTERVAL ${CLEANUP_INTERVAL}000 MICROSECOND)`);
      }),
    )
    .orWhere(
      // Clear old messages
      new Brackets(qb => {
        qb.where("is_permanent = 0");
        qb.andWhere(`posted_at <= (NOW() - INTERVAL ${RETENTION_PERIOD}000 MICROSECOND)`);
      }),
    )
    .delete()
    .execute();

  setTimeout(cleanup, CLEANUP_INTERVAL);
}

// Start first cleanup 30 seconds after startup
setTimeout(cleanup, 30 * 1000);

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
      timestamp: msg.timestamp,
    };

    if (msg.attachments.length) data.attachments = msg.attachments;
    if (msg.embeds.length) data.embeds = msg.embeds;

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

  getUserMessagesByChannelAfterId(userId, channelId, afterId, limit = null) {
    let query = this.messages
      .createQueryBuilder()
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("user_id = :user_id", { user_id: userId })
      .andWhere("channel_id = :channel_id", { channel_id: channelId })
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
      console.warn(e); // tslint:disable-line
      return;
    }

    const inserted = await this.messages.findOne(data.id);
    this.events.emit("create", [inserted]);
    this.events.emit(`create:${data.id}`, [inserted]);
  }

  async createFromMsg(msg: Message, overrides = {}) {
    const existingSavedMsg = await this.find(msg.id);
    if (existingSavedMsg) return;

    const savedMessageData = this.msgToSavedMessageData(msg);
    const postedAt = moment.utc(msg.timestamp, "x").format("YYYY-MM-DD HH:mm:ss.SSS");

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
    const deletedAt = moment().format("YYYY-MM-DD HH:mm:ss.SSS");

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

    await this.messages.update(
      { id },
      {
        data: newData,
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

  async onceMessageAvailable(id: string, handler: (msg: SavedMessage) => any, timeout: number = 60 * 1000) {
    let called = false;
    let onceEventListener;
    let timeoutFn;

    const callHandler = async (msg: SavedMessage) => {
      this.events.off(`create:${id}`, onceEventListener);
      clearTimeout(timeoutFn);

      if (called) return;
      called = true;

      await handler(msg);
    };

    onceEventListener = this.events.once(`create:${id}`, callHandler);
    timeoutFn = setTimeout(() => {
      called = true;
      callHandler(null);
    }, timeout);

    const messageInDB = await this.find(id);
    if (messageInDB) {
      callHandler(messageInDB);
    }
  }
}
