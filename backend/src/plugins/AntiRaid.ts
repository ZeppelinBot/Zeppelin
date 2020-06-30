import { IPluginOptions, logger } from "knub";
import * as t from "io-ts";
import { ZeppelinPluginClass } from "./ZeppelinPluginClass";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";
import { convertDelayStringToMS, MINUTES, sorter, stripObjectToScalars, tDelayString } from "../utils";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import moment from "moment-timezone";

const AntiRaidLevel = t.type({
  on_join: t.type({
    kick: t.boolean,
    ban: t.boolean,
  }),
});

const ConfigSchema = t.type({
  enabled: t.boolean,
  delay: tDelayString,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

interface IDeletionQueueItem {
  deleteAt: number;
  message: SavedMessage;
}

const MAX_DELAY = 5 * MINUTES;

export class AntiRaid extends ZeppelinPluginClass<TConfigSchema> {
  public static pluginName = "auto_delete";
  public static showInDocs = true;

  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Auto-delete",
    description: "Allows Zeppelin to auto-delete messages from a channel after a delay",
    configurationGuide: "Maximum deletion delay is currently 5 minutes",
  };

  protected guildSavedMessages: GuildSavedMessages;
  protected guildLogs: GuildLogs;

  protected onMessageCreateFn;
  protected onMessageDeleteFn;
  protected onMessageDeleteBulkFn;

  protected deletionQueue: IDeletionQueueItem[];
  protected nextDeletion: number;
  protected nextDeletionTimeout;

  protected maxDelayWarningSent = false;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        enabled: false,
        delay: "5s",
      },
    };
  }

  protected onLoad() {
    this.guildSavedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.guildLogs = new GuildLogs(this.guildId);

    this.deletionQueue = [];

    this.onMessageCreateFn = this.onMessageCreate.bind(this);
    this.onMessageDeleteFn = this.onMessageDelete.bind(this);
    this.onMessageDeleteBulkFn = this.onMessageDeleteBulk.bind(this);

    this.guildSavedMessages.events.on("create", this.onMessageCreateFn);
    this.guildSavedMessages.events.on("delete", this.onMessageDeleteFn);
    this.guildSavedMessages.events.on("deleteBulk", this.onMessageDeleteBulkFn);
  }

  protected onUnload() {
    this.guildSavedMessages.events.off("create", this.onMessageCreateFn);
    this.guildSavedMessages.events.off("delete", this.onMessageDeleteFn);
    this.guildSavedMessages.events.off("deleteBulk", this.onMessageDeleteFn);
    clearTimeout(this.nextDeletionTimeout);
  }

  protected addMessageToDeletionQueue(msg: SavedMessage, delay: number) {
    const deleteAt = Date.now() + delay;
    this.deletionQueue.push({ deleteAt, message: msg });
    this.deletionQueue.sort(sorter("deleteAt"));

    this.scheduleNextDeletion();
  }

  protected scheduleNextDeletion() {
    if (this.deletionQueue.length === 0) {
      clearTimeout(this.nextDeletionTimeout);
      return;
    }

    const firstDeleteAt = this.deletionQueue[0].deleteAt;
    clearTimeout(this.nextDeletionTimeout);
    this.nextDeletionTimeout = setTimeout(() => this.deleteNextItem(), firstDeleteAt - Date.now());
  }

  protected async deleteNextItem() {
    const [itemToDelete] = this.deletionQueue.splice(0, 1);
    if (!itemToDelete) return;

    this.guildLogs.ignoreLog(LogType.MESSAGE_DELETE, itemToDelete.message.id);
    this.bot.deleteMessage(itemToDelete.message.channel_id, itemToDelete.message.id).catch(logger.warn);

    this.scheduleNextDeletion();

    const user = await this.resolveUser(itemToDelete.message.user_id);
    const channel = this.guild.channels.get(itemToDelete.message.channel_id);
    const messageDate = moment(itemToDelete.message.data.timestamp, "x").format("YYYY-MM-DD HH:mm:ss");

    this.guildLogs.log(LogType.MESSAGE_DELETE_AUTO, {
      message: itemToDelete.message,
      user: stripObjectToScalars(user),
      channel: stripObjectToScalars(channel),
      messageDate,
    });
  }

  protected onMessageCreate(msg: SavedMessage) {
    const config = this.getConfigForMemberIdAndChannelId(msg.user_id, msg.channel_id);
    if (config.enabled) {
      let delay = convertDelayStringToMS(config.delay);

      if (delay > MAX_DELAY) {
        delay = MAX_DELAY;
        if (!this.maxDelayWarningSent) {
          this.guildLogs.log(LogType.BOT_ALERT, {
            body: `Clamped auto-deletion delay in <#${msg.channel_id}> to 5 minutes`,
          });
          this.maxDelayWarningSent = true;
        }
      }

      this.addMessageToDeletionQueue(msg, delay);
    }
  }

  protected onMessageDelete(msg: SavedMessage) {
    const indexToDelete = this.deletionQueue.findIndex(item => item.message.id === msg.id);
    if (indexToDelete > -1) {
      this.deletionQueue.splice(indexToDelete, 1);
      this.scheduleNextDeletion();
    }
  }

  protected onMessageDeleteBulk(messages: SavedMessage[]) {
    for (const msg of messages) {
      this.onMessageDelete(msg);
    }
  }
}
