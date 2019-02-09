import { Plugin, decorators as d } from "knub";
import { Message, TextChannel } from "eris";
import { errorMessage, successMessage } from "../utils";
import { GuildTags } from "../data/GuildTags";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";

const TAG_FUNCTIONS = {
  countdown(toDate) {
    const now = moment();
    const target = moment(toDate, "YYYY-MM-DD HH:mm:ss");
    const diff = target.diff(now);
    const result = humanizeDuration(diff, { largest: 2, round: true });
    return diff >= 0 ? result : `${result} ago`;
  }
};

export class TagsPlugin extends Plugin {
  public static pluginName = "tags";

  protected tags: GuildTags;
  protected savedMessages: GuildSavedMessages;

  private onMessageCreateFn;
  private onMessageDeleteFn;

  getDefaultOptions() {
    return {
      config: {
        prefix: "!!",
        delete_with_command: true
      },

      permissions: {
        create: false,
        use: true,
        list: false
      },

      overrides: [
        {
          level: ">=50",
          permissions: {
            create: true,
            list: true
          }
        }
      ]
    };
  }

  onLoad() {
    this.tags = GuildTags.getInstance(this.guildId);
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);

    this.onMessageCreateFn = this.onMessageCreate.bind(this);
    this.savedMessages.events.on("create", this.onMessageCreateFn);

    this.onMessageDeleteFn = this.onMessageDelete.bind(this);
    this.savedMessages.events.on("delete", this.onMessageDeleteFn);
  }

  onUnload() {
    this.savedMessages.events.off("create", this.onMessageCreateFn);
    this.savedMessages.events.off("delete", this.onMessageDeleteFn);
  }

  @d.command("tag list")
  @d.command("tags")
  @d.command("taglist")
  @d.permission("list")
  async tagListCmd(msg: Message) {
    const tags = await this.tags.all();
    if (tags.length === 0) {
      msg.channel.createMessage(`No tags created yet! Use \`tag create\` command to create one.`);
      return;
    }

    const prefix = this.configValueForMsg(msg, "prefix");
    const tagNames = tags.map(t => t.tag).sort();
    msg.channel.createMessage(`
      Available tags (use with ${prefix}tag): \`\`\`${tagNames.join(", ")}\`\`\`
    `);
  }

  @d.command("tag delete", "<tag:string>")
  @d.permission("create")
  async deleteTagCmd(msg: Message, args: { tag: string }) {
    const tag = await this.tags.find(args.tag);
    if (!tag) {
      msg.channel.createMessage(errorMessage("No tag with that name"));
      return;
    }

    await this.tags.delete(args.tag);
    msg.channel.createMessage(successMessage("Tag deleted!"));
  }

  @d.command("tag", "<tag:string> <body:string$>")
  @d.permission("create")
  async tagCmd(msg: Message, args: { tag: string; body: string }) {
    await this.tags.createOrUpdate(args.tag, args.body, msg.author.id);

    const prefix = this.configValue("prefix");
    msg.channel.createMessage(successMessage(`Tag set! Use it with: \`${prefix}${args.tag}\``));
  }

  async onMessageCreate(msg: SavedMessage) {
    const member = this.guild.members.get(msg.user_id);
    if (!this.hasPermission("use", { member, channelId: msg.channel_id })) return;

    if (!msg.data.content) return;
    if (msg.is_bot) return;

    const prefix = this.configValueForMemberIdAndChannelId(msg.user_id, msg.channel_id, "prefix");
    if (!msg.data.content.startsWith(prefix)) return;

    const tagNameMatch = msg.data.content.slice(prefix.length).match(/^\S+/);
    if (tagNameMatch === null) return;

    const tagName = tagNameMatch[0];
    const tag = await this.tags.find(tagName);
    if (!tag) return;

    let body = tag.body;

    // Substitute variables (matched with Knub's argument parser -> supports quotes etc.)
    const variableStr = msg.data.content.slice(prefix.length + tagName.length).trim();
    const variableValues = this.commands.parseArguments(variableStr).map(v => v.value);
    let variableIndex = 0;
    body = body.replace(/(?<!\\)%[a-zA-Z]+/g, () => variableValues[variableIndex++] || "");

    // Run functions
    body = body.replace(/(?<!\\)\{([a-zA-Z]+)(?::?(.*?))?\}/, (_, fn, args) => {
      if (!TAG_FUNCTIONS[fn]) return "";
      const fnArgs = args ? args.split(/(?<!\\):/) : [];

      try {
        return TAG_FUNCTIONS[fn].apply(null, fnArgs);
      } catch (e) {
        return "";
      }
    });

    const channel = this.guild.channels.get(msg.channel_id) as TextChannel;
    const responseMsg = await channel.createMessage(body);

    // Save the command-response message pair once the message is in our database
    if (this.configValueForMemberIdAndChannelId(msg.user_id, msg.channel_id, "delete_with_command")) {
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
