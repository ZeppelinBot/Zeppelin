import { Snowflake } from "discord.js";
import { guildPlugin } from "vety";
import moment from "moment-timezone";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { GuildTags } from "../../data/GuildTags.js";
import { humanizeDuration } from "../../humanizeDuration.js";
import { makePublicFn } from "../../pluginUtils.js";
import { convertDelayStringToMS } from "../../utils.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { TagCreateCmd } from "./commands/TagCreateCmd.js";
import { TagDeleteCmd } from "./commands/TagDeleteCmd.js";
import { TagEvalCmd } from "./commands/TagEvalCmd.js";
import { TagListCmd } from "./commands/TagListCmd.js";
import { TagSourceCmd } from "./commands/TagSourceCmd.js";
import { TagsPluginType, zTagsConfig } from "./types.js";
import { findTagByName } from "./util/findTagByName.js";
import { onMessageCreate } from "./util/onMessageCreate.js";
import { onMessageDelete } from "./util/onMessageDelete.js";
import { renderTagBody } from "./util/renderTagBody.js";

export const TagsPlugin = guildPlugin<TagsPluginType>()({
  name: "tags",

  dependencies: () => [LogsPlugin],
  configSchema: zTagsConfig,
  defaultOverrides: [
    {
      level: ">=50",
      config: {
        can_use: true,
        can_create: true,
        can_list: true,
      },
    },
  ],

  // prettier-ignore
  messageCommands: [
    TagEvalCmd,
    TagDeleteCmd,
    TagListCmd,
    TagSourceCmd,
    TagCreateCmd,
  ],

  // prettier-ignore
  events: [
    onMessageDelete,
  ],

  public(pluginData) {
    return {
      renderTagBody: makePublicFn(pluginData, renderTagBody),
      findTagByName: makePublicFn(pluginData, findTagByName),
    };
  },

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.tags = GuildTags.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.logs = new GuildLogs(guild.id);

    state.tagFunctions = {};
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  afterLoad(pluginData) {
    const { state } = pluginData;

    state.onMessageCreateFn = (msg) => onMessageCreate(pluginData, msg);
    state.savedMessages.events.on("create", state.onMessageCreateFn);

    const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

    const tz = timeAndDate.getGuildTz();
    state.tagFunctions = {
      parseDateTime(str) {
        if (typeof str === "number") {
          return str; // Unix timestamp
        }

        if (typeof str !== "string") {
          return Date.now();
        }

        if (!Number.isNaN(Number(str))) {
          return Number(str); // Unix timestamp as a string
        }

        return moment.tz(str, "YYYY-MM-DD HH:mm:ss", tz).valueOf();
      },

      countdown(toDate) {
        const target = moment.utc(this.parseDateTime(toDate), "x");

        const now = moment.utc();
        if (!target.isValid()) return "";

        const diff = target.diff(now);
        const result = humanizeDuration(diff, { largest: 2, round: true });
        return diff >= 0 ? result : `${result} ago`;
      },

      now() {
        return Date.now();
      },

      timeAdd(...args) {
        if (args.length === 0) return;
        let reference;
        let delay;

        for (const [i, arg] of args.entries()) {
          if (typeof arg === "number") {
            args[i] = String(arg);
          } else if (typeof arg !== "string") {
            args[i] = "";
          }
        }

        if (args.length >= 2) {
          // (time, delay)
          reference = this.parseDateTime(args[0]);
          delay = args[1];
        } else {
          // (delay), implicit "now" as time
          reference = Date.now();
          delay = args[0];
        }

        const delayMS = convertDelayStringToMS(delay) ?? 0;
        return moment.utc(reference, "x").add(delayMS).valueOf();
      },

      timeSub(...args) {
        if (args.length === 0) return;
        let reference;
        let delay;

        for (const [i, arg] of args.entries()) {
          if (typeof arg === "number") {
            args[i] = String(arg);
          } else if (typeof arg !== "string") {
            args[i] = "";
          }
        }

        if (args.length >= 2) {
          // (time, delay)
          reference = this.parseDateTime(args[0]);
          delay = args[1];
        } else {
          // (delay), implicit "now" as time
          reference = Date.now();
          delay = args[0];
        }

        const delayMS = convertDelayStringToMS(delay) ?? 0;
        return moment.utc(reference, "x").subtract(delayMS).valueOf();
      },

      timeAgo(delay) {
        return this.timeSub(delay);
      },

      formatTime(time, format) {
        const parsed = this.parseDateTime(time);
        return timeAndDate.inGuildTz(parsed).format(format);
      },

      discordDateFormat(time) {
        const parsed = time ? this.parseDateTime(time) : Date.now();

        return timeAndDate.inGuildTz(parsed).format("YYYY-MM-DD");
      },

      mention: (input) => {
        if (typeof input !== "string") {
          return "";
        }

        if (input.match(/^<(?:@[!&]?|#)\d+>$/)) {
          return input;
        }

        if (
          pluginData.guild.members.cache.has(input as Snowflake) ||
          pluginData.client.users.resolve(input as Snowflake)
        ) {
          return `<@!${input}>`;
        }

        if (pluginData.guild.channels.cache.has(input as Snowflake)) {
          return `<#${input}>`;
        }

        return "";
      },

      isMention: (input) => {
        if (typeof input !== "string") {
          return false;
        }

        return /^<(?:@[!&]?|#)\d+>$/.test(input);
      },
    };

    for (const [name, fn] of Object.entries(state.tagFunctions)) {
      state.tagFunctions[name] = (fn as any).bind(state.tagFunctions);
    }
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.savedMessages.events.off("create", state.onMessageCreateFn);
  },
});
