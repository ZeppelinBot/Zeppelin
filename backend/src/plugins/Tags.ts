import { decorators as d, IPluginOptions, logger } from "knub";
import { Member, Message, TextChannel } from "eris";
import {
  convertDelayStringToMS,
  errorMessage,
  renderRecursively,
  StrictMessageContent,
  stripObjectToScalars,
  tEmbed,
  tNullable,
  tStrictMessageContent,
} from "../utils";
import { GuildTags } from "../data/GuildTags";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { ZeppelinPluginClass } from "./ZeppelinPluginClass";
import { parseTemplate, renderTemplate, TemplateParseError } from "../templateFormatter";
import { GuildArchives } from "../data/GuildArchives";
import * as t from "io-ts";
import { parseArguments } from "knub-command-manager";
import escapeStringRegexp from "escape-string-regexp";
import { validate } from "../validatorUtils";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";

const Tag = t.union([t.string, tEmbed]);

const TagCategory = t.type({
  prefix: tNullable(t.string),
  delete_with_command: tNullable(t.boolean),

  user_tag_cooldown: tNullable(t.union([t.string, t.number])), // Per user, per tag
  user_category_cooldown: tNullable(t.union([t.string, t.number])), // Per user, per tag category
  global_tag_cooldown: tNullable(t.union([t.string, t.number])), // Any user, per tag
  global_category_cooldown: tNullable(t.union([t.string, t.number])), // Any user, per category

  tags: t.record(t.string, Tag),

  can_use: tNullable(t.boolean),
});

const ConfigSchema = t.type({
  prefix: t.string,
  delete_with_command: t.boolean,

  user_tag_cooldown: tNullable(t.union([t.string, t.number])), // Per user, per tag
  global_tag_cooldown: tNullable(t.union([t.string, t.number])), // Any user, per tag
  user_cooldown: tNullable(t.union([t.string, t.number])), // Per user
  global_cooldown: tNullable(t.union([t.string, t.number])), // Any tag use

  categories: t.record(t.string, TagCategory),

  can_create: t.boolean,
  can_use: t.boolean,
  can_list: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export class TagsPlugin extends ZeppelinPluginClass<TConfigSchema> {
  public static pluginName = "tags";
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Tags",
  };

  protected archives: GuildArchives;
  protected tags: GuildTags;
  protected savedMessages: GuildSavedMessages;
  protected logs: GuildLogs;

  private onMessageCreateFn;
  private onMessageDeleteFn;

  protected tagFunctions;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        prefix: "!!",
        delete_with_command: true,

        user_tag_cooldown: null,
        global_tag_cooldown: null,
        user_cooldown: null,
        global_cooldown: null,

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
  }

  onLoad() {
    this.archives = GuildArchives.getGuildInstance(this.guildId);
    this.tags = GuildTags.getGuildInstance(this.guildId);
    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.logs = new GuildLogs(this.guildId);

    this.onMessageCreateFn = this.onMessageCreate.bind(this);
    this.savedMessages.events.on("create", this.onMessageCreateFn);

    this.onMessageDeleteFn = this.onMessageDelete.bind(this);
    this.savedMessages.events.on("delete", this.onMessageDeleteFn);

    this.tagFunctions = {
      parseDateTime(str) {
        if (typeof str === "number") {
          return str; // Unix timestamp
        }

        if (typeof str !== "string") {
          return Date.now();
        }

        return moment(str, "YYYY-MM-DD HH:mm:ss").valueOf();
      },

      countdown(toDate) {
        const target = moment(this.parseDateTime(toDate));

        const now = moment();
        if (!target.isValid()) return "";

        const diff = target.diff(now);
        const result = humanizeDuration(diff, { largest: 2, round: true });
        return diff >= 0 ? result : `${result} ago`;
      },

      now() {
        return Date.now();
      },

      timeAdd(...args) {
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

        const delayMS = convertDelayStringToMS(delay);
        return moment(reference)
          .add(delayMS)
          .valueOf();
      },

      timeSub(...args) {
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

        const delayMS = convertDelayStringToMS(delay);
        return moment(reference)
          .subtract(delayMS)
          .valueOf();
      },

      timeAgo(delay) {
        return this.timeSub(delay);
      },

      formatTime(time, format) {
        const parsed = this.parseDateTime(time);
        return moment(parsed).format(format);
      },

      discordDateFormat(time) {
        const parsed = time ? this.parseDateTime(time) : Date.now();

        return moment(parsed).format("YYYY-MM-DD");
      },

      mention: input => {
        if (typeof input !== "string") {
          return "";
        }

        if (input.match(/^<(@#)(!&)\d+>$/)) {
          return input;
        }

        if (this.guild.members.has(input) || this.bot.users.has(input)) {
          return `<@!${input}>`;
        }

        if (this.guild.channels.has(input) || this.bot.channelGuildMap[input]) {
          return `<#${input}>`;
        }

        return "";
      },
    };

    for (const [name, fn] of Object.entries(this.tagFunctions)) {
      this.tagFunctions[name] = (fn as any).bind(this.tagFunctions);
    }
  }

  onUnload() {
    this.savedMessages.events.off("create", this.onMessageCreateFn);
    this.savedMessages.events.off("delete", this.onMessageDeleteFn);
  }

  @d.command("tag list", [], {
    aliases: ["tags", "taglist"],
  })
  @d.permission("can_list")
  async tagListCmd(msg: Message) {
    const tags = await this.tags.all();
    if (tags.length === 0) {
      msg.channel.createMessage(`No tags created yet! Use \`tag create\` command to create one.`);
      return;
    }

    const prefix = this.getConfigForMsg(msg).prefix;
    const tagNames = tags.map(tag => tag.tag).sort();
    msg.channel.createMessage(`
      Available tags (use with ${prefix}tag): \`\`\`${tagNames.join(", ")}\`\`\`
    `);
  }

  @d.command("tag delete", "<tag:string>")
  @d.permission("can_create")
  async deleteTagCmd(msg: Message, args: { tag: string }) {
    const tag = await this.tags.find(args.tag);
    if (!tag) {
      msg.channel.createMessage(errorMessage("No tag with that name"));
      return;
    }

    await this.tags.delete(args.tag);
    this.sendSuccessMessage(msg.channel, "Tag deleted!");
  }

  @d.command("tag eval", "<body:string$>")
  @d.permission("can_create")
  async evalTagCmd(msg: Message, args: { body: string }) {
    const rendered = await this.renderTag(args.body);
    msg.channel.createMessage(rendered);
  }

  @d.command("tag", "<tag:string> <body:string$>")
  @d.permission("can_create")
  async tagCmd(msg: Message, args: { tag: string; body: string }) {
    try {
      parseTemplate(args.body);
    } catch (e) {
      if (e instanceof TemplateParseError) {
        msg.channel.createMessage(errorMessage(`Invalid tag syntax: ${e.message}`));
        return;
      } else {
        throw e;
      }
    }

    await this.tags.createOrUpdate(args.tag, args.body, msg.author.id);

    const prefix = this.getConfig().prefix;
    this.sendSuccessMessage(msg.channel, `Tag set! Use it with: \`${prefix}${args.tag}\``);
  }

  @d.command("tag", "<tag:string>", {
    options: [
      {
        name: "delete",
        shortcut: "d",
        isSwitch: true,
      },
    ],
  })
  @d.permission("can_create")
  async tagSourceCmd(msg: Message, args: { tag: string; delete?: boolean }) {
    if (args.delete) {
      return this.deleteTagCmd(msg, { tag: args.tag });
    }

    const tag = await this.tags.find(args.tag);
    if (!tag) {
      msg.channel.createMessage(errorMessage("No tag with that name"));
      return;
    }

    const archiveId = await this.archives.create(tag.body, moment().add(10, "minutes"));
    const url = this.archives.getUrl(this.knub.getGlobalConfig().url, archiveId);

    msg.channel.createMessage(`Tag source:\n${url}`);
  }

  async renderTag(body, args = [], extraData = {}) {
    const dynamicVars = {};
    const maxTagFnCalls = 25;
    let tagFnCalls = 0;

    const data = {
      args,
      ...extraData,
      ...this.tagFunctions,
      set(name, val) {
        if (typeof name !== "string") return;
        dynamicVars[name] = val;
      },
      get(name) {
        return dynamicVars[name] == null ? "" : dynamicVars[name];
      },
      tag: async (name, ...subTagArgs) => {
        if (tagFnCalls++ > maxTagFnCalls) return "\\_recursion\\_";
        if (typeof name !== "string") return "";
        if (name === "") return "";
        // TODO: Incorporate tag categories here
        const subTag = await this.tags.find(name);
        if (!subTag) return "";
        return renderTemplate(subTag.body, { ...data, args: subTagArgs });
      },
    };

    return renderTemplate(body, data);
  }

  async renderSafeTagFromMessage(
    str: string,
    prefix: string,
    tagName: string,
    tagBody: t.TypeOf<typeof Tag>,
    member: Member,
  ): Promise<StrictMessageContent | null> {
    const variableStr = str.slice(prefix.length + tagName.length).trim();
    const tagArgs = parseArguments(variableStr).map(v => v.value);

    const renderTagString = async _str => {
      let rendered = await this.renderTag(_str, tagArgs, {
        member: stripObjectToScalars(member, ["user"]),
        user: stripObjectToScalars(member.user),
      });
      rendered = rendered.trim();

      return rendered;
    };

    // Format the string
    try {
      return typeof tagBody === "string"
        ? { content: await renderTagString(tagBody) }
        : await renderRecursively(tagBody, renderTagString);
    } catch (e) {
      if (e instanceof TemplateParseError) {
        logger.warn(`Invalid tag format!\nError: ${e.message}\nFormat: ${tagBody}`);
        return null;
      } else {
        throw e;
      }
    }
  }

  async onMessageCreate(msg: SavedMessage) {
    if (msg.is_bot) return;
    if (!msg.data.content) return;

    const member = await this.getMember(msg.user_id);
    if (!member) return;

    const config = this.getConfigForMemberIdAndChannelId(msg.user_id, msg.channel_id);
    let deleteWithCommand = false;

    // Find potential matching tag, looping through categories first and checking dynamic tags last
    let renderedTag = null;
    let matchedTagName;
    const cooldowns = [];

    for (const [name, category] of Object.entries(config.categories)) {
      const canUse = category.can_use != null ? category.can_use : config.can_use;
      if (canUse !== true) continue;

      const prefix = category.prefix != null ? category.prefix : config.prefix;
      if (prefix !== "" && !msg.data.content.startsWith(prefix)) continue;

      const withoutPrefix = msg.data.content.slice(prefix.length);

      for (const [tagName, tagBody] of Object.entries(category.tags)) {
        const regex = new RegExp(`^${escapeStringRegexp(tagName)}(?:\s|$)`);
        if (regex.test(withoutPrefix)) {
          renderedTag = await this.renderSafeTagFromMessage(
            msg.data.content,
            prefix,
            tagName,
            category.tags[tagName],
            member,
          );
          if (renderedTag) {
            matchedTagName = tagName;
            break;
          }
        }
      }

      if (renderedTag) {
        if (category.user_tag_cooldown) {
          const delay = convertDelayStringToMS(String(category.user_tag_cooldown), "s");
          cooldowns.push([`tags-category-${name}-user-${msg.user_id}-tag-${matchedTagName}`, delay]);
        }
        if (category.global_tag_cooldown) {
          const delay = convertDelayStringToMS(String(category.global_tag_cooldown), "s");
          cooldowns.push([`tags-category-${name}-tag-${matchedTagName}`, delay]);
        }
        if (category.user_category_cooldown) {
          const delay = convertDelayStringToMS(String(category.user_category_cooldown), "s");
          cooldowns.push([`tags-category-${name}-user--${msg.user_id}`, delay]);
        }
        if (category.global_category_cooldown) {
          const delay = convertDelayStringToMS(String(category.global_category_cooldown), "s");
          cooldowns.push([`tags-category-${name}`, delay]);
        }

        deleteWithCommand =
          category.delete_with_command != null ? category.delete_with_command : config.delete_with_command;

        break;
      }
    }

    // Matching tag was not found from the config, try a dynamic tag
    if (!renderedTag) {
      if (config.can_use !== true) return;

      const prefix = config.prefix;
      if (!msg.data.content.startsWith(prefix)) return;

      const tagNameMatch = msg.data.content.slice(prefix.length).match(/^\S+/);
      if (tagNameMatch === null) return;

      const tagName = tagNameMatch[0];
      const tag = await this.tags.find(tagName);
      if (!tag) return;

      matchedTagName = tagName;

      renderedTag = await this.renderSafeTagFromMessage(msg.data.content, prefix, tagName, tag.body, member);
    }

    if (!renderedTag) return;

    if (config.user_tag_cooldown) {
      const delay = convertDelayStringToMS(String(config.user_tag_cooldown), "s");
      cooldowns.push([`tags-user-${msg.user_id}-tag-${matchedTagName}`, delay]);
    }

    if (config.global_tag_cooldown) {
      const delay = convertDelayStringToMS(String(config.global_tag_cooldown), "s");
      cooldowns.push([`tags-tag-${matchedTagName}`, delay]);
    }

    if (config.user_cooldown) {
      const delay = convertDelayStringToMS(String(config.user_cooldown), "s");
      cooldowns.push([`tags-user-${matchedTagName}`, delay]);
    }

    if (config.global_cooldown) {
      const delay = convertDelayStringToMS(String(config.global_cooldown), "s");
      cooldowns.push([`tags`, delay]);
    }

    const isOnCooldown = cooldowns.some(cd => this.cooldowns.isOnCooldown(cd[0]));
    if (isOnCooldown) return;

    for (const cd of cooldowns) {
      this.cooldowns.setCooldown(cd[0], cd[1]);
    }

    deleteWithCommand = config.delete_with_command;

    const validationError = await validate(tStrictMessageContent, renderedTag);
    if (validationError) {
      this.logs.log(LogType.BOT_ALERT, {
        body: `Rendering tag ${matchedTagName} resulted in an invalid message: ${validationError.message}`,
      });
      return;
    }

    const channel = this.guild.channels.get(msg.channel_id) as TextChannel;
    const responseMsg = await channel.createMessage(renderedTag);

    // Save the command-response message pair once the message is in our database
    if (deleteWithCommand) {
      this.savedMessages.onceMessageAvailable(responseMsg.id, async () => {
        await this.tags.addResponse(msg.id, responseMsg.id);
      });
    }
  }

  async onMessageDelete(msg: SavedMessage) {
    // Command message was deleted -> delete the response as well
    const commandMsgResponse = await this.tags.findResponseByCommandMessageId(msg.id);
    if (commandMsgResponse) {
      const channel = this.guild.channels.get(msg.channel_id) as TextChannel;
      if (!channel) return;

      const responseMsg = await this.savedMessages.find(commandMsgResponse.response_message_id);
      if (!responseMsg || responseMsg.deleted_at != null) return;

      await channel.deleteMessage(commandMsgResponse.response_message_id);
      return;
    }

    // Response was deleted -> delete the command message as well
    const responseMsgResponse = await this.tags.findResponseByResponseMessageId(msg.id);
    if (responseMsgResponse) {
      const channel = this.guild.channels.get(msg.channel_id) as TextChannel;
      if (!channel) return;

      const commandMsg = await this.savedMessages.find(responseMsgResponse.command_message_id);
      if (!commandMsg || commandMsg.deleted_at != null) return;

      await channel.deleteMessage(responseMsgResponse.command_message_id);
      return;
    }
  }
}
