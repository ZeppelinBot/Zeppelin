import { Brackets, getRepository, Repository } from "typeorm";
import { BaseRepository } from "./BaseRepository";
import { ISavedMessageData, SavedMessage } from "./entities/SavedMessage";
import EventEmitter from "events";

const CLEANUP_INTERVAL = 5 * 60 * 1000;

const RETENTION_PERIOD = 7 * 24 * 60 * 60 * 1000; // 1 week

export class GuildSavedMessages extends BaseRepository {
  private messages: Repository<SavedMessage>;
  public events: EventEmitter;

  constructor(guildId) {
    super(guildId);
    this.messages = getRepository(SavedMessage);
    this.events = new EventEmitter();

    this.cleanup();
    setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
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
    return this.messages.findOne({
      where: {
        guild_id: this.guildId,
        id
      }
    });
  }

  async create(data) {
    try {
      await this.messages.insert({ ...data, guild_id: this.guildId });
    } catch (e) {
      return;
    }

    const inserted = await this.messages.findOne(data.id);
    this.events.emit("create", [inserted]);
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

  async edit(id, newData: ISavedMessageData) {
    const oldMessage = await this.messages.findOne(id);
    const newMessage = { ...oldMessage, data: newData };

    await this.messages.update(
      { id },
      {
        data: newData
      }
    );

    this.events.emit("edit", [newMessage, oldMessage]);
  }
}
