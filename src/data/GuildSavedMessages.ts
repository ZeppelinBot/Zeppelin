import { Brackets, getRepository, Repository } from "typeorm";
import { BaseRepository } from "./BaseRepository";
import { ISavedMessageData, SavedMessage } from "./entities/SavedMessage";
import { QueuedEventEmitter } from "../QueuedEventEmitter";
import { GuildChannel, Message } from "eris";
import moment from "moment-timezone";

const CLEANUP_INTERVAL = 5 * 60 * 1000;

const RETENTION_PERIOD = 7 * 24 * 60 * 60 * 1000; // 1 week

export class GuildSavedMessages extends BaseRepository {
  private messages: Repository<SavedMessage>;
  protected toBePermanent: Set<string>;

  public events: QueuedEventEmitter;

  constructor(guildId) {
    super(guildId);
    this.messages = getRepository(SavedMessage);
    this.events = new QueuedEventEmitter();

    this.toBePermanent = new Set();

    this.cleanup();
    setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
  }

  public msgToSavedMessageData(msg: Message): ISavedMessageData {
    const data: ISavedMessageData = {
      author: {
        username: msg.author.username,
        discriminator: msg.author.discriminator
      },
      content: msg.content
    };

    if (msg.attachments.length) data.attachments = msg.attachments;
    if (msg.embeds.length) data.embeds = msg.embeds;

    return data;
  }

  async cleanup() {
    await this.messages
      .createQueryBuilder("messages")
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere(
        new Brackets(qb => {
          // Clear deleted messages
          qb.orWhere(
            new Brackets(qb2 => {
              qb2.where("deleted_at IS NOT NULL");
              qb2.andWhere(`deleted_at <= (NOW() - INTERVAL ${CLEANUP_INTERVAL}000 MICROSECOND)`);
            })
          );

          // Clear old messages
          qb.orWhere(
            new Brackets(qb2 => {
              qb2.where("is_permanent = 0");
              qb2.andWhere(`posted_at <= (NOW() - INTERVAL ${RETENTION_PERIOD}000 MICROSECOND)`);
            })
          );
        })
      )
      .delete()
      .execute();
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

  async create(data) {
    const isPermanent = this.toBePermanent.has(data.id);
    if (isPermanent) {
      data.is_permanent = true;
      this.toBePermanent.delete(data.id);
    }

    try {
      await this.messages.insert(data);
    } catch (e) {
      console.warn(e);
      return;
    }

    const inserted = await this.messages.findOne(data.id);
    this.events.emit("create", [inserted]);
  }

  async createFromMsg(msg: Message, overrides = {}) {
    const savedMessageData = this.msgToSavedMessageData(msg);
    const postedAt = moment.utc(msg.timestamp, "x").format("YYYY-MM-DD HH:mm:ss.SSS");

    const data = {
      id: msg.id,
      guild_id: (msg.channel as GuildChannel).guild.id,
      channel_id: msg.channel.id,
      user_id: msg.author.id,
      is_bot: msg.author.bot,
      data: savedMessageData,
      posted_at: postedAt
    };

    return this.create({ ...data, ...overrides });
  }

  async markAsDeleted(id) {
    await this.messages
      .createQueryBuilder("messages")
      .update()
      .set({
        deleted_at: () => "NOW(3)"
      })
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("id = :id", { id })
      .execute();

    const deleted = await this.messages.findOne(id);
    this.events.emit("delete", [deleted]);
  }

  async markBulkAsDeleted(ids) {
    await this.messages
      .createQueryBuilder()
      .update()
      .set({
        deleted_at: () => "NOW(3)"
      })
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("id IN (:ids)", { ids })
      .execute();

    const deleted = await this.messages
      .createQueryBuilder()
      .where("id IN (:ids)", { ids })
      .getMany();

    this.events.emit("deleteBulk", [deleted]);
  }

  async saveEdit(id, newData: ISavedMessageData) {
    const oldMessage = await this.messages.findOne(id);
    if (!oldMessage) return;

    const newMessage = { ...oldMessage, data: newData };

    await this.messages.update(
      { id },
      {
        data: newData
      }
    );

    this.events.emit("update", [newMessage, oldMessage]);
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
          is_permanent: true
        }
      );
    } else {
      this.toBePermanent.add(id);
    }
  }
}
