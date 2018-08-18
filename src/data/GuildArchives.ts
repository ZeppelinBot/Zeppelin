import uuid from "uuid/v4"; // tslint:disable-line
import moment from "moment-timezone";
import knex from "../knex";
import SpamLog from "../models/SpamLog";

const DEFAULT_EXPIRY_DAYS = 30;

function deleteExpiredArchives() {
  knex("archives")
    .where("expires_at", "<=", knex.raw("NOW()"))
    .delete();
}

deleteExpiredArchives();
setInterval(deleteExpiredArchives, 1000 * 60 * 60); // Clean expired archives every hour

export class GuildArchives {
  protected guildId: string;

  constructor(guildId) {
    this.guildId = guildId;
  }

  generateNewLogId() {
    return uuid();
  }

  async find(id: string): Promise<SpamLog> {
    const result = await knex("archives")
      .where("id", id)
      .first();

    return result ? new SpamLog(result) : null;
  }

  async create(body: string, expiresAt: moment.Moment = null) {
    const id = this.generateNewLogId();
    if (!expiresAt) {
      expiresAt = moment().add(DEFAULT_EXPIRY_DAYS, "days");
    }

    await knex("archives").insert({
      id,
      guild_id: this.guildId,
      body,
      expires_at: expiresAt.format("YYYY-MM-DD HH:mm:ss")
    });

    return id;
  }
}
