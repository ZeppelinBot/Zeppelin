import { GuildChannel, Message } from "discord.js";
import moment from "moment-timezone";
import { getRepository, Repository } from "typeorm";
import { QueuedEventEmitter } from "../QueuedEventEmitter";
import { noop } from "../utils";
import { asyncMap } from "../utils/async";
import { decryptJson, encryptJson } from "../utils/cryptHelpers";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { buildEntity } from "./buildEntity";
import { ISavedMessageData, SavedMessage } from "./entities/SavedMessage";

export class GuildSavedMessages extends BaseGuildRepository<SavedMessage> {
  private messages: Repository<SavedMessage>;
  protected toBePermanent: Set<string>;

  public events: QueuedEventEmitter;

  constructor(guildId) {
    super(guildId);
    this.messages = getRepository(SavedMessage);
    this.events = new QueuedEventEmitter();

    this.toBePermanent = new Set();
  }

  protected msgToSavedMessageData(msg: Message): ISavedMessageData {
    const data: ISavedMessageData = {
      author: {
        username: msg.author.username,
        discriminator: msg.author.discriminator,
      },
      content: msg.content,
      timestamp: msg.createdTimestamp,
    };

    if (msg.attachments.size) {
      data.attachments = Array.from(msg.attachments.values()).map((att) => ({
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
      data.embeds = msg.embeds.map((embed) => ({
        title: embed.title,
        description: embed.description,
        url: embed.url,
        timestamp: embed.timestamp ? Date.parse(embed.timestamp) : null,
        color: embed.color,

        fields: embed.fields.map((field) => ({
          name: field.name,
          value: field.value,
          inline: field.inline ?? false,
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
      data.stickers = Array.from(msg.stickers.values()).map((sticker) => ({
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

  protected async _processEntityFromDB(entity: SavedMessage | undefined) {
    if (entity == null) {
      return entity;
    }

    entity.data = await decryptJson(entity.data as unknown as string);
    return entity;
  }

  protected async _processEntityToDB(entity: Partial<SavedMessage>) {
    if (entity.data) {
      entity.data = (await encryptJson(entity.data)) as any;
    }
    return entity;
  }

  async find(id: string, includeDeleted = false): Promise<SavedMessage | undefined> {
    let query = this.messages
      .createQueryBuilder()
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("id = :id", { id });

    if (!includeDeleted) {
      query = query.andWhere("deleted_at IS NULL");
    }

    const result = await query.getOne();

    return this.processEntityFromDB(result);
  }

  async getUserMessagesByChannelAfterId(userId, channelId, afterId, limit?: number): Promise<SavedMessage[]> {
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

    const results = await query.getMany();

    return this.processMultipleEntitiesFromDB(results);
  }

  async getMultiple(messageIds: string[]): Promise<SavedMessage[]> {
    const results = await this.messages
      .createQueryBuilder()
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("id IN (:messageIds)", { messageIds })
      .getMany();

    return this.processMultipleEntitiesFromDB(results);
  }

  async createFromMsg(msg: Message, overrides = {}): Promise<void> {
    // FIXME: Hotfix
    if (!msg.channel) {
      return;
    }

    // Don't actually save bot messages. Just pass them through as if they were saved.
    if (msg.author.bot) {
      const fakeSavedMessage = buildEntity(SavedMessage, await this.msgToInsertReadyEntity(msg));
      this.fireCreateEvents(fakeSavedMessage);
      return;
    }

    await this.createFromMessages([msg], overrides);
  }

  async createFromMessages(messages: Message[], overrides = {}): Promise<void> {
    const items = await asyncMap(messages, async (msg) => ({
      ...(await this.msgToInsertReadyEntity(msg)),
      ...overrides,
    }));
    await this.insertBulk(items);
  }

  protected async msgToInsertReadyEntity(msg: Message): Promise<Partial<SavedMessage>> {
    const savedMessageData = this.msgToSavedMessageData(msg);
    const postedAt = moment.utc(msg.createdTimestamp, "x").format("YYYY-MM-DD HH:mm:ss");

    return {
      id: msg.id,
      guild_id: (msg.channel as GuildChannel).guild.id,
      channel_id: msg.channel.id,
      user_id: msg.author.id,
      is_bot: msg.author.bot,
      data: savedMessageData,
      posted_at: postedAt,
    };
  }

  protected async insertBulk(items: Array<Partial<SavedMessage>>): Promise<void> {
    for (const item of items) {
      if (this.toBePermanent.has(item.id!)) {
        item.is_permanent = true;
        this.toBePermanent.delete(item.id!);
      }
    }

    const itemsToInsert = await asyncMap(items, (item) => this.processEntityToDB({ ...item }));
    await this.messages.createQueryBuilder().insert().values(itemsToInsert).execute().catch(noop);

    for (const item of items) {
      // perf: save a db lookup and message content decryption by building the entity manually
      const inserted = buildEntity(SavedMessage, item);
      this.fireCreateEvents(inserted);
    }
  }

  protected async fireCreateEvents(message: SavedMessage) {
    this.events.emit("create", [message]);
    this.events.emit(`create:${message.id}`, [message]);
  }

  async markAsDeleted(id): Promise<void> {
    await this.messages
      .createQueryBuilder("messages")
      .update()
      .set({
        deleted_at: () => "NOW(3)",
      })
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("id = :id", { id })
      .execute();

    const deleted = await this.find(id, true);

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

    let deleted = await this.messages
      .createQueryBuilder()
      .where("id IN (:ids)", { ids })
      .andWhere("deleted_at = :deletedAt", { deletedAt })
      .getMany();
    deleted = await this.processMultipleEntitiesFromDB(deleted);

    if (deleted.length) {
      this.events.emit("deleteBulk", [deleted]);
    }
  }

  async saveEdit(id, newData: ISavedMessageData): Promise<void> {
    const oldMessage = await this.find(id);
    if (!oldMessage) return;

    const newMessage = { ...oldMessage, data: newData };

    // @ts-ignore
    const updateData = await this.processEntityToDB({
      data: newData,
    });
    await this.messages.update({ id }, updateData);

    this.events.emit("update", [newMessage, oldMessage]);
    this.events.emit(`update:${id}`, [newMessage, oldMessage]);
  }

  async saveEditFromMsg(msg: Message): Promise<void> {
    const newData = this.msgToSavedMessageData(msg);
    await this.saveEdit(msg.id, newData);
  }

  async setPermanent(id: string): Promise<void> {
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

  async onceMessageAvailable(
    id: string,
    handler: (msg?: SavedMessage) => any,
    timeout: number = 60 * 1000,
  ): Promise<void> {
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
