import { decorators as d, IPluginOptions, logger } from "knub";
import { Member, Message, TextChannel } from "eris";
import { errorMessage, successMessage, stripObjectToScalars, tNullable } from "../utils";
import { GuildTags } from "../data/GuildTags";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { parseTemplate, renderTemplate, TemplateParseError } from "../templateFormatter";
import { GuildArchives } from "../data/GuildArchives";
import * as t from "io-ts";
import { parseArguments } from "knub-command-manager";
import escapeStringRegexp from "escape-string-regexp";

const TagCategory = t.type({
  prefix: tNullable(t.string),
  delete_with_command: tNullable(t.boolean),

  tags: t.record(t.string, t.string),

  can_use: tNullable(t.boolean),
});

const ConfigSchema = t.type({
  prefix: t.string,
  delete_with_command: t.boolean,

  categories: t.record(t.string, TagCategory),

  can_create: t.boolean,
  can_use: t.boolean,
  can_list: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export class TagsPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "tags";
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Tags",
  };

  protected archives: GuildArchives;
  protected tags: GuildTags;
  protected savedMessages: GuildSavedMessages;

  private onMessageCreateFn;
  private onMessageDeleteFn;

  protected tagFunctions;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        prefix: "!!",
        delete_with_command: true,

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

    this.onMessageCreateFn = this.onMessageCreate.bind(this);
    this.savedMessages.events.on("create", this.onMessageCreateFn);

    this.onMessageDeleteFn = this.onMessageDelete.bind(this);
    this.savedMessages.events.on("delete", this.onMessageDeleteFn);

    this.tagFunctions = {
      countdown(toDate) {
        if (typeof toDate !== "string") return "";

        const now = moment();
        const target = moment(toDate, "YYYY-MM-DD HH:mm:ss");
        if (!target.isValid()) return "";

        const diff = target.diff(now);
        const result = humanizeDuration(diff, { largest: 2, round: true });
        return diff >= 0 ? result : `${result} ago`;
      },

      mention: input => {
        if (typeof input !== "string") return "";
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
    msg.channel.createMessage(successMessage("Tag deleted!"));
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
    msg.channel.createMessage(successMessage(`Tag set! Use it with: \`${prefix}${args.tag}\``));
  }

  @d.command("tag", "<tag:string>")
  async tagSourceCmd(msg: Message, args: { tag: string }) {
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
    tagBody: string,
    member: Member,
  ): Promise<string | null> {
    const variableStr = str.slice(prefix.length + tagName.length).trim();
    const tagArgs = parseArguments(variableStr).map(v => v.value);

    // Format the string
    try {
      let rendered = await this.renderTag(tagBody, tagArgs, {
        member: stripObjectToScalars(member, ["user"]),
        user: stripObjectToScalars(member.user),
      });
      rendered = rendered.trim();

      if (rendered === "") return;
      if (rendered.length > 2000) return;

      return rendered;
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
          if (renderedTag) break;
        }
      }

      if (renderedTag) {
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

      renderedTag = await this.renderSafeTagFromMessage(msg.data.content, prefix, tagName, tag.body, member);
    }

    if (!renderedTag) return;

    deleteWithCommand = config.delete_with_command;

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
