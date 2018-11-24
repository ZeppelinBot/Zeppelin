import { Plugin, decorators as d, reply } from "knub";
import { Channel, EmbedOptions, Message, TextChannel, User, VoiceChannel } from "eris";
import { embedPadding, errorMessage, stripObjectToScalars, successMessage, trimLines } from "../utils";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { GuildCases } from "../data/GuildCases";
import { CaseTypes } from "../data/CaseTypes";
import { SavedMessage } from "../data/entities/SavedMessage";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { GuildArchives } from "../data/GuildArchives";

const MAX_SEARCH_RESULTS = 15;
const MAX_CLEAN_COUNT = 50;
const CLEAN_COMMAND_DELETE_DELAY = 5000;

const activeReloads: Map<string, TextChannel> = new Map();

export class UtilityPlugin extends Plugin {
  protected logs: GuildLogs;
  protected cases: GuildCases;
  protected savedMessages: GuildSavedMessages;
  protected archives: GuildArchives;

  getDefaultOptions() {
    return {
      permissions: {
        roles: false,
        level: false,
        search: false,
        clean: false,
        info: false,
        server: false,
        reload_guild: false
      },
      overrides: [
        {
          level: ">=50",
          permissions: {
            roles: true,
            level: true,
            search: true,
            clean: true,
            info: true,
            server: true,
            reload_guild: true
          }
        }
      ]
    };
  }

  onLoad() {
    this.logs = new GuildLogs(this.guildId);
    this.cases = GuildCases.getInstance(this.guildId);
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);
    this.archives = GuildArchives.getInstance(this.guildId);

    if (activeReloads && activeReloads.has(this.guildId)) {
      activeReloads.get(this.guildId).createMessage(successMessage("Reloaded!"));
      activeReloads.delete(this.guildId);
    }
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
    msg.channel.createMessage(`The permission level of ${member.username}#${member.discriminator} is **${level}**`);
  }

  @d.command("search", "<query:string$>")
  @d.permission("search")
  async searchCmd(msg: Message, args: { query: string }) {
    let [, query, inputPageNum] = args.query.match(/^(.*?)(?:\s([0-9]+))?$/);
    query = query.toLowerCase();

    const matchingMembers = this.guild.members.filter(member => {
      const fullUsername = `${member.user.username}#${member.user.discriminator}`;
      if (member.nick && member.nick.toLowerCase().indexOf(query) !== -1) return true;
      if (fullUsername.toLowerCase().indexOf(query) !== -1) return true;
      return false;
    });

    if (matchingMembers.length > 0) {
      let header;
      const resultText = matchingMembers.length === 1 ? "result" : "results";

      const paginated = matchingMembers.length > MAX_SEARCH_RESULTS;

      const pageInputMatch = args.query.match(/\s([0-9]+)$/);
      const inputPage = pageInputMatch ? parseInt(pageInputMatch[1], 10) : 1;
      const lastPage = Math.ceil(matchingMembers.length / MAX_SEARCH_RESULTS);
      const page = Math.min(lastPage, Math.max(1, inputPage));

      const from = (page - 1) * MAX_SEARCH_RESULTS;
      const to = Math.min(from + MAX_SEARCH_RESULTS, matchingMembers.length);

      if (paginated) {
        header = `Found ${matchingMembers.length} ${resultText} (showing ${from + 1}-${to})`;
      } else {
        header = `Found ${matchingMembers.length} ${resultText}`;
      }

      let lines = matchingMembers.map(member => {
        return `${member.user.username}#${member.user.discriminator} (${member.id})`;
      });
      lines.sort((a, b) => {
        return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
      });
      lines = lines.slice(from, to);

      const footer = paginated ? "Add a page number to the end of the command to browse results" : "";

      msg.channel.createMessage(`${header}\n\`\`\`${lines.join("\n")}\`\`\`${footer}`);
    } else {
      msg.channel.createMessage(errorMessage("No results found"));
    }
  }

  async cleanMessages(channel: Channel, savedMessages: SavedMessage[], mod: User) {
    this.logs.ignoreLog(LogType.MESSAGE_DELETE, savedMessages[0].id);
    this.logs.ignoreLog(LogType.MESSAGE_DELETE_BULK, savedMessages[0].id);

    const idsToDelete = savedMessages.map(m => m.id);
    await this.bot.deleteMessages(channel.id, idsToDelete);
    await this.savedMessages.markBulkAsDeleted(idsToDelete);

    savedMessages.reverse();
    const user = this.bot.users.get(savedMessages[0].user_id);
    const archiveId = await this.archives.createFromSavedMessages(savedMessages, this.guild, channel, user);
    const archiveUrl = `${this.knub.getGlobalConfig().url}/archives/${archiveId}`;

    this.logs.log(LogType.CLEAN, {
      mod: stripObjectToScalars(mod),
      channel: stripObjectToScalars(channel),
      count: savedMessages.length,
      archiveUrl
    });
  }

  @d.command("clean", "<count:number>")
  @d.command("clean all", "<count:number>")
  @d.permission("clean")
  async cleanAllCmd(msg: Message, args: { count: number }) {
    if (args.count > MAX_CLEAN_COUNT || args.count <= 0) {
      msg.channel.createMessage(errorMessage(`Clean count must be between 1 and ${MAX_CLEAN_COUNT}`));
      return;
    }

    const messagesToClean = await this.savedMessages.getLatestByChannelBeforeId(msg.channel.id, msg.id, args.count);
    if (messagesToClean.length > 0) {
      await this.cleanMessages(msg.channel, messagesToClean, msg.author);
    }

    const responseMsg = await msg.channel.createMessage(
      successMessage(`Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`)
    );

    setTimeout(() => {
      msg.delete().catch(() => {});
      responseMsg.delete().catch(() => {});
    }, CLEAN_COMMAND_DELETE_DELAY);
  }

  @d.command("clean user", "<userId:string> <count:number>")
  @d.permission("clean")
  async cleanUserCmd(msg: Message, args: { userId: string; count: number }) {
    if (args.count > MAX_CLEAN_COUNT || args.count <= 0) {
      msg.channel.createMessage(errorMessage(`Clean count must be between 1 and ${MAX_CLEAN_COUNT}`));
      return;
    }

    const messagesToClean = await this.savedMessages.getLatestByChannelAndUser(msg.channel.id, args.userId, args.count);
    if (messagesToClean.length > 0) {
      await this.cleanMessages(msg.channel, messagesToClean, msg.author);
    }

    const responseMsg = await msg.channel.createMessage(
      successMessage(`Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`)
    );

    setTimeout(() => {
      msg.delete().catch(() => {});
      responseMsg.delete().catch(() => {});
    }, CLEAN_COMMAND_DELETE_DELAY);
  }

  @d.command("clean bot", "<count:number>")
  @d.permission("clean")
  async cleanBotCmd(msg: Message, args: { count: number }) {
    if (args.count > MAX_CLEAN_COUNT || args.count <= 0) {
      msg.channel.createMessage(errorMessage(`Clean count must be between 1 and ${MAX_CLEAN_COUNT}`));
      return;
    }

    const messagesToClean = await this.savedMessages.getLatestBotMessagesByChannel(msg.channel.id, args.count);
    if (messagesToClean.length > 0) {
      await this.cleanMessages(msg.channel, messagesToClean, msg.author);
    }

    const responseMsg = await msg.channel.createMessage(
      successMessage(`Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`)
    );

    setTimeout(() => {
      msg.delete().catch(() => {});
      responseMsg.delete().catch(() => {});
    }, CLEAN_COMMAND_DELETE_DELAY);
  }

  @d.command("info", "<userId:userId>")
  @d.permission("info")
  async infoCmd(msg: Message, args: { userId: string }) {
    const embed: EmbedOptions = {
      fields: []
    };

    const user = this.bot.users.get(args.userId);
    if (user) {
      const createdAt = moment(user.createdAt);
      const accountAge = humanizeDuration(moment().valueOf() - user.createdAt, {
        largest: 2,
        round: true
      });

      embed.title = `${user.username}#${user.discriminator}`;
      embed.thumbnail = { url: user.avatarURL };

      embed.fields.push({
        name: "User information",
        value:
          trimLines(`
          ID: ${user.id}
          Profile: <@!${user.id}>
          Created: ${accountAge} ago (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})
        `) + embedPadding
      });
    } else {
      embed.title = `Unknown user`;
    }

    const member = this.guild.members.get(args.userId);
    if (member) {
      const joinedAt = moment(member.joinedAt);
      const joinAge = humanizeDuration(moment().valueOf() - member.joinedAt, {
        largest: 2,
        round: true
      });
      const roles = member.roles.map(id => this.guild.roles.get(id));

      embed.fields.push({
        name: "Member information",
        value:
          trimLines(`
          Joined: ${joinAge} ago (${joinedAt.format("YYYY-MM-DD[T]HH:mm:ss")})
          ${roles.length > 0 ? "Roles: " + roles.map(r => r.name).join(", ") : ""}
        `) + embedPadding
      });
    }

    const cases = await this.cases.getByUserId(args.userId);
    if (cases.length > 0) {
      cases.sort((a, b) => {
        return a.created_at < b.created_at ? 1 : -1;
      });

      const caseSummary = cases.slice(0, 3).map(c => {
        return `${CaseTypes[c.type]} (#${c.case_number})`;
      });

      const summaryText = cases.length > 3 ? "Last 3 cases" : "Summary";

      embed.fields.push({
        name: "Cases",
        value: trimLines(`
          Total cases: ${cases.length}
          ${summaryText}: ${caseSummary.join(", ")}
        `)
      });
    }

    msg.channel.createMessage({ embed });
  }

  @d.command("server")
  @d.permission("server")
  async serverCmd(msg: Message) {
    await this.guild.fetchAllMembers();

    const embed: EmbedOptions = {
      fields: []
    };

    embed.thumbnail = { url: this.guild.iconURL };

    const createdAt = moment(this.guild.createdAt);
    const serverAge = humanizeDuration(moment().valueOf() - this.guild.createdAt, {
      largest: 2,
      round: true
    });

    embed.fields.push({
      name: "Server information",
      value:
        trimLines(`
        Created: ${serverAge} ago (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})
        Members: ${this.guild.memberCount}
        ${this.guild.features.length > 0 ? "Features: " + this.guild.features.join(", ") : ""}
      `) + embedPadding
    });

    const textChannels = this.guild.channels.filter(channel => channel instanceof TextChannel);
    const voiceChannels = this.guild.channels.filter(channel => channel instanceof VoiceChannel);

    embed.fields.push({
      name: "Counts",
      value:
        trimLines(`
        Roles: ${this.guild.roles.size}
        Text channels: ${textChannels.length}
        Voice channels: ${voiceChannels.length}
      `) + embedPadding
    });

    const onlineMembers = this.guild.members.filter(m => m.status === "online");
    const dndMembers = this.guild.members.filter(m => m.status === "dnd");
    const idleMembers = this.guild.members.filter(m => m.status === "idle");
    const offlineMembers = this.guild.members.filter(m => m.status === "offline");

    embed.fields.push({
      name: "Members",
      value: trimLines(`
        Online: **${onlineMembers.length}**
        Idle: **${idleMembers.length}**
        DND: **${dndMembers.length}**
        Offline: **${offlineMembers.length}**
      `)
    });

    msg.channel.createMessage({ embed });
  }

  @d.command("reload_guild")
  @d.permission("reload_guild")
  reloadGuildCmd(msg: Message) {
    if (activeReloads.has(this.guildId)) return;
    activeReloads.set(this.guildId, msg.channel as TextChannel);

    msg.channel.createMessage("Reloading...");
    this.knub.reloadGuild(this.guildId);
  }
}
