import uuid from "uuid/v4"; // tslint:disable-line
import moment from "moment-timezone";
import knex from "../knex";
import SpamLog from "../models/SpamLog";
import { Message } from "eris";
import { formatTemplateString, stripObjectToScalars, trimLines } from "../utils";

const EXPIRY_DAYS = 90;
const MESSAGE_FORMAT =
  "[{timestamp}] [{message.id}] {user.username}#{user.discriminator}: {message.content}{attachments}";

function cleanExpiredLogs() {
  knex("spam_logs")
    .where("expires_at", "<=", knex.raw("NOW()"))
    .delete();
}

cleanExpiredLogs();
setInterval(cleanExpiredLogs, 1000 * 60 * 60); // Clean expired logs every hour

export class GuildSpamLogs {
  protected guildId: string;

  constructor(guildId) {
    this.guildId = guildId;
  }

  async find(id: string): Promise<SpamLog> {
    const result = await knex("spam_logs")
      .where("id", id)
      .first();

    return result ? new SpamLog(result) : null;
  }

  /**
   * @return ID of the created spam log entry
   */
  async createFromMessages(messages: Message[], header: string = null) {
    const lines = messages.map(msg => {
      return formatTemplateString(MESSAGE_FORMAT, {
        user: stripObjectToScalars(msg.author),
        message: stripObjectToScalars(msg),
        timestamp: moment(msg.timestamp).format("YYYY-MM-DD HH:mm:ss zz"),
        attachments: msg.attachments.length
          ? ` (message contained ${msg.attachments.length} attachment(s))`
          : ""
      });
    });

    const id = uuid();
    const now = moment().format("YYYY-MM-DD HH:mm:ss zz");
    const expiresAt = moment().add(EXPIRY_DAYS, "days");

    const body = trimLines(`
      Log file generated on ${now}. Expires at ${expiresAt.format("YYYY-MM-DD HH:mm:ss zz")}.${
      header ? "\n" + header : ""
    }
      
      ${lines.join("\n")}
    `);

    await knex("spam_logs").insert({
      id,
      guild_id: this.guildId,
      body,
      expires_at: expiresAt.format("YYYY-MM-DD HH:mm:ss")
    });

    return id;
  }
}
