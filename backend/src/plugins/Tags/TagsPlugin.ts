import { Snowflake } from "discord.js";
import humanizeDuration from "humanize-duration";
import { PluginOptions } from "knub";
import moment from "moment-timezone";
import { StrictValidationError } from "src/validatorUtils";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildTags } from "../../data/GuildTags";
import { mapToPublicFn } from "../../pluginUtils";
import { convertDelayStringToMS } from "../../utils";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { TagCreateCmd } from "./commands/TagCreateCmd";
import { TagDeleteCmd } from "./commands/TagDeleteCmd";
import { TagEvalCmd } from "./commands/TagEvalCmd";
import { TagListCmd } from "./commands/TagListCmd";
import { TagSourceCmd } from "./commands/TagSourceCmd";
import { ConfigSchema, TagsPluginType } from "./types";
import { findTagByName } from "./util/findTagByName";
import { onMessageCreate } from "./util/onMessageCreate";
import { onMessageDelete } from "./util/onMessageDelete";
import { renderTagBody } from "./util/renderTagBody";

const defaultOptions: PluginOptions<TagsPluginType> = {
  config: {
    prefix: "!!",
    delete_with_command: true,

    user_tag_cooldown: null,
    global_tag_cooldown: null,
    user_cooldown: null,
    allow_mentions: false,
    global_cooldown: null,
    auto_delete_command: false,

    categories: {},

    can_create: false,
    can_use: false,
    can_list: false,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_use: true,
        can_create: true,
        can_list: true,
      },
    },
  ],
};

export const TagsPlugin = zeppelinGuildPlugin<TagsPluginType>()({
  name: "tags",
  showInDocs: true,
  info: {
    prettyName: "Tags",
  },

  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
    TagEvalCmd,
    TagDeleteCmd,
    TagListCmd,
    TagSourceCmd,
    TagCreateCmd,
  ],

  public: {
    renderTagBody: mapToPublicFn(renderTagBody),
    findTagByName: mapToPublicFn(findTagByName),
  },

  configPreprocessor(options) {
    if (options.config.delete_with_command && options.config.auto_delete_command) {
      throw new StrictValidationError([
        `Cannot have both (global) delete_with_command and global_delete_invoke enabled`,
      ]);
    }

    // Check each category for conflicting options
    if (options.config?.categories) {
      for (const [name, opts] of Object.entries(options.config.categories)) {
        const cat = options.config.categories[name];
        if (cat.delete_with_command && cat.auto_delete_command) {
          throw new StrictValidationError([
            `Cannot have both (category specific) delete_with_command and category_delete_invoke enabled at <categories/${name}>`,
          ]);
        }
      }
    }

    return options;
  },

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.tags = GuildTags.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.logs = new GuildLogs(guild.id);

    state.tagFunctions = {};
  },

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.onMessageCreateFn = msg => onMessageCreate(pluginData, msg);
    state.savedMessages.events.on("create", state.onMessageCreateFn);

    state.onMessageDeleteFn = msg => onMessageDelete(pluginData, msg);
    state.savedMessages.events.on("delete", state.onMessageDeleteFn);

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
        return moment
          .utc(reference, "x")
          .add(delayMS)
          .valueOf();
      },

      timeSub(...args) {
        if (args.length === 0) return;
        let reference;
        let delay;

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
        return moment
          .utc(reference, "x")
          .subtract(delayMS)
          .valueOf();
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

      mention: input => {
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

      isMention: input => {
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
    pluginData.state.savedMessages.events.off("create", pluginData.state.onMessageCreateFn);
    pluginData.state.savedMessages.events.off("delete", pluginData.state.onMessageDeleteFn);
  },
});
