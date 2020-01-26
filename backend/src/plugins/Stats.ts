import { ZeppelinPlugin } from "./ZeppelinPlugin";
import * as t from "io-ts";
import { convertDelayStringToMS, DAYS, HOURS, tAlphanumeric, tDateTime, tDeepPartial, tDelayString } from "../utils";
import { IPluginOptions } from "knub";
import moment from "moment-timezone";
import { GuildStats } from "../data/GuildStats";
import { Message } from "eris";
import escapeStringRegexp from "escape-string-regexp";
import { SavedMessage } from "../data/entities/SavedMessage";
import { GuildSavedMessages } from "../data/GuildSavedMessages";

//region TYPES

const tBaseSource = t.type({
  name: tAlphanumeric,
  track: t.boolean,
  retention_period: tDelayString,
});

const tMemberMessagesSource = t.intersection([
  tBaseSource,
  t.type({
    type: t.literal("member_messages"),
  }),
]);
type TMemberMessagesSource = t.TypeOf<typeof tMemberMessagesSource>;

const tChannelMessagesSource = t.intersection([
  tBaseSource,
  t.type({
    type: t.literal("channel_messages"),
  }),
]);
type TChannelMessagesSource = t.TypeOf<typeof tChannelMessagesSource>;

const tKeywordsSource = t.intersection([
  tBaseSource,
  t.type({
    type: t.literal("keywords"),
    keywords: t.array(t.string),
  }),
]);
type TKeywordsSource = t.TypeOf<typeof tKeywordsSource>;

const tSource = t.union([tMemberMessagesSource, tChannelMessagesSource, tKeywordsSource]);
type TSource = t.TypeOf<typeof tSource>;

const tConfigSchema = t.type({
  sources: t.record(tAlphanumeric, tSource),
});

type TConfigSchema = t.TypeOf<typeof tConfigSchema>;
const tPartialConfigSchema = tDeepPartial(tConfigSchema);

//endregion
//region CONSTANTS

const DEFAULT_RETENTION_PERIOD = "4w";

//endregion
//region PLUGIN

export class StatsPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "stats";
  public static configSchema = tConfigSchema;
  public static showInDocs = false;

  protected stats: GuildStats;
  protected savedMessages: GuildSavedMessages;

  private onMessageCreateFn;
  private cleanStatsInterval;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        sources: {},
      },
    };
  }

  protected static applyDefaultsToSource(source: Partial<TSource>) {
    if (source.track == null) {
      source.track = true;
    }

    if (source.retention_period == null) {
      source.retention_period = DEFAULT_RETENTION_PERIOD;
    }
  }

  protected static preprocessStaticConfig(config: t.TypeOf<typeof tPartialConfigSchema>) {
    if (config.sources) {
      for (const [key, source] of Object.entries(config.sources)) {
        source.name = key;
        this.applyDefaultsToSource(source);
      }
    }

    return config;
  }

  protected onLoad() {
    this.stats = GuildStats.getGuildInstance(this.guildId);
    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);

    this.onMessageCreateFn = this.savedMessages.events.on("create", msg => this.onMessageCreate(msg));

    this.cleanOldStats();
    this.cleanStatsInterval = setInterval(() => this.cleanOldStats(), 1 * DAYS);
  }

  protected onUnload() {
    this.savedMessages.events.off("create", this.onMessageCreateFn);
    clearInterval(this.cleanStatsInterval);
  }

  protected async cleanOldStats() {
    const config = this.getConfig();
    for (const source of Object.values(config.sources)) {
      const cutoffMS = convertDelayStringToMS(source.retention_period);
      const cutoff = moment()
        .subtract(cutoffMS, "ms")
        .format("YYYY-MM-DD HH:mm:ss");
      await this.stats.deleteOldValues(source.name, cutoff);
    }
  }

  protected saveMemberMessagesStats(source: TMemberMessagesSource, msg: SavedMessage) {
    this.stats.saveValue(source.name, msg.user_id, 1);
  }

  protected saveChannelMessagesStats(source: TChannelMessagesSource, msg: SavedMessage) {
    this.stats.saveValue(source.name, msg.channel_id, 1);
  }

  protected saveKeywordsStats(source: TKeywordsSource, msg: SavedMessage) {
    const content = msg.data.content;
    if (!content) return;

    for (const keyword of source.keywords) {
      const regex = new RegExp(`\\b${escapeStringRegexp(keyword)}\\b`, "i");
      if (content.match(regex)) {
        this.stats.saveValue(source.name, "keyword", 1);
        break;
      }
    }
  }

  onMessageCreate(msg: SavedMessage) {
    const config = this.getConfigForMemberIdAndChannelId(msg.user_id, msg.channel_id);
    for (const source of Object.values(config.sources)) {
      if (!source.track) continue;

      if (source.type === "member_messages") {
        this.saveMemberMessagesStats(source, msg);
      } else if (source.type === "channel_messages") {
        this.saveChannelMessagesStats(source, msg);
      } else if (source.type === "keywords") {
        this.saveKeywordsStats(source, msg);
      }
    }
  }
}
