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
import { convertDelayStringToMS, trimPluginDescription } from "../../utils";
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
import { LogsPlugin } from "../Logs/LogsPlugin";
import { generateTemplateMarkdown } from "./docs";
import { TemplateFunctions } from "./templateFunctions";

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
    description: "Tags are a way to store and reuse information.",
    configurationGuide: trimPluginDescription(`
      ### Template Functions
      You can use template functions in your tags. These functions are called when the tag is rendered.
      You can use these functions to render dynamic content, or to access information from the message and/or user calling the tag.
      You use them by adding a \`{}\` on your tag.

      Here are the functions you can use in your tags:
      
      ${generateTemplateMarkdown(TemplateFunctions)}
    `),
  },

  configSchema: ConfigSchema,
  dependencies: () => [LogsPlugin],
  defaultOptions,

  // prettier-ignore
  commands: [
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
    pluginData.state.savedMessages.events.off("create", pluginData.state.onMessageCreateFn);
  },
});
