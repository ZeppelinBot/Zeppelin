import { Plugin, decorators as d, reply } from "knub";
import { Channel, Message, TextChannel, User } from "eris";
import { errorMessage, getMessages, stripObjectToScalars, successMessage } from "../utils";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";

const MAX_SEARCH_RESULTS = 15;
const MAX_CLEAN_COUNT = 50;

export class UtilityPlugin extends Plugin {
  protected logs: GuildLogs;

  getDefaultOptions() {
    return {
      permissions: {
        roles: false,
        level: false,
        search: false,
        clean: false,
        info: false
      },
      overrides: [
        {
          level: ">=50",
          permissions: {
            roles: true,
            level: true,
            search: true,
            clean: true,
            info: true
          }
        }
      ]
    };
  }

  onLoad() {
    this.logs = new GuildLogs(this.guildId);
  }

  @d.command("roles")
  @d.permission("roles")
  async rolesCmd(msg: Message) {
    const roles = (msg.channel as TextChannel).guild.roles.map(role => `${role.name} ${role.id}`);
    msg.channel.createMessage("```" + roles.join("\n") + "```");
  }

  @d.command("level", "[userId:string]")
  @d.permission("level")
  async levelCmd(msg: Message, args) {
    const member = args.userId ? this.guild.members.get(args.userId) : msg.member;

    if (!member) {
      msg.channel.createMessage(errorMessage("Member not found"));
      return;
    }

    const level = this.getMemberLevel(member);
    msg.channel.createMessage(
      `The permission level of ${member.username}#${member.discriminator} is **${level}**`
    );
  }

  @d.command("search", "<query:string$>")
  @d.permission("search")
  async searchCmd(msg: Message, args: { query: string }) {
    const query = args.query.toLowerCase();
    const matchingMembers = this.guild.members.filter(member => {
      const fullUsername = `${member.user.username}#${member.user.discriminator}`;
      if (member.nick && member.nick.toLowerCase().indexOf(query) !== -1) return true;
      if (fullUsername.toLowerCase().indexOf(query) !== -1) return true;
      return false;
    });

    if (matchingMembers.length > 0) {
      let header;
      const resultText = matchingMembers.length === 1 ? "result" : "results";

      if (matchingMembers.length > MAX_SEARCH_RESULTS) {
        header = `Found ${matchingMembers.length} ${resultText} (showing ${MAX_SEARCH_RESULTS})`;
      } else {
        header = `Found ${matchingMembers.length} ${resultText}`;
      }

      const lines = matchingMembers.slice(0, MAX_SEARCH_RESULTS).map(member => {
        return `${member.user.username}#${member.user.discriminator} (${member.id})`;
      });
      lines.sort((a, b) => {
        return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
      });

      msg.channel.createMessage(`${header}\n\`\`\`${lines.join("\n")}\`\`\``);
    } else {
      msg.channel.createMessage(errorMessage("No results found"));
    }
  }

  async cleanMessages(channel: Channel, messageIds: string[], mod: User) {
    this.logs.ignoreLog(LogType.MESSAGE_DELETE, messageIds[0]);
    this.logs.ignoreLog(LogType.MESSAGE_DELETE_BULK, messageIds[0]);
    await this.bot.deleteMessages(channel.id, messageIds);
    this.logs.log(LogType.CLEAN, {
      mod: stripObjectToScalars(mod),
      channel: stripObjectToScalars(channel),
      count: messageIds.length
    });
  }

  @d.command("clean", "<count:number>")
  @d.command("clean all", "<count:number>")
  @d.permission("clean")
  async cleanAllCmd(msg: Message, args: { count: number }) {
    if (args.count > MAX_CLEAN_COUNT || args.count <= 0) {
      msg.channel.createMessage(
        errorMessage(`Clean count must be between 1 and ${MAX_CLEAN_COUNT}`)
      );
      return;
    }

    const messagesToClean = await getMessages(
      msg.channel as TextChannel,
      m => m.id !== msg.id,
      args.count
    );
    if (messagesToClean.length > 0)
      await this.cleanMessages(msg.channel, messagesToClean.map(m => m.id), msg.author);

    msg.channel.createMessage(
      successMessage(
        `Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`
      )
    );
  }

  @d.command("clean user", "<userId:string> <count:number>")
  @d.permission("clean")
  async cleanUserCmd(msg: Message, args: { userId: string; count: number }) {
    if (args.count > MAX_CLEAN_COUNT || args.count <= 0) {
      msg.channel.createMessage(
        errorMessage(`Clean count must be between 1 and ${MAX_CLEAN_COUNT}`)
      );
      return;
    }

    const messagesToClean = await getMessages(
      msg.channel as TextChannel,
      m => m.id !== msg.id && m.author.id === args.userId,
      args.count
    );
    if (messagesToClean.length > 0)
      await this.cleanMessages(msg.channel, messagesToClean.map(m => m.id), msg.author);

    msg.channel.createMessage(
      successMessage(
        `Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`
      )
    );
  }

  @d.command("clean bot", "<count:number>")
  @d.permission("clean")
  async cleanBotCmd(msg: Message, args: { count: number }) {
    if (args.count > MAX_CLEAN_COUNT || args.count <= 0) {
      msg.channel.createMessage(
        errorMessage(`Clean count must be between 1 and ${MAX_CLEAN_COUNT}`)
      );
      return;
    }

    const messagesToClean = await getMessages(
      msg.channel as TextChannel,
      m => m.id !== msg.id && m.author.bot,
      args.count
    );
    if (messagesToClean.length > 0)
      await this.cleanMessages(msg.channel, messagesToClean.map(m => m.id), msg.author);

    msg.channel.createMessage(
      successMessage(
        `Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`
      )
    );
  }
}
