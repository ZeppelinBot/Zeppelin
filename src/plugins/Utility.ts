import { decorators as d } from "knub";
import { CategoryChannel, Channel, EmbedOptions, Member, Message, Role, TextChannel, User, VoiceChannel } from "eris";
import {
  channelMentionRegex,
  chunkArray,
  embedPadding,
  errorMessage,
  isSnowflake,
  multiSorter,
  noop,
  simpleClosestStringMatch,
  sorter,
  stripObjectToScalars,
  successMessage,
  trimLines,
} from "../utils";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { GuildCases } from "../data/GuildCases";
import { CaseTypes } from "../data/CaseTypes";
import { SavedMessage } from "../data/entities/SavedMessage";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { GuildArchives } from "../data/GuildArchives";
import { ZeppelinPlugin } from "./ZeppelinPlugin";

const { performance } = require("perf_hooks");

const MAX_SEARCH_RESULTS = 15;
const MAX_CLEAN_COUNT = 50;
const CLEAN_COMMAND_DELETE_DELAY = 5000;

const activeReloads: Map<string, TextChannel> = new Map();

export class UtilityPlugin extends ZeppelinPlugin {
  public static pluginName = "utility";

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
        reload_guild: false,
        nickname: false,
        ping: false,
        source: false,
        vcmove: false,
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
            nickname: true,
            vcmove: true,
          },
        },
        {
          level: ">=100",
          permissions: {
            reload_guild: true,
            ping: true,
            source: true,
          },
        },
      ],
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

  @d.command("roles", "[search:string$]", {
    options: [
      {
        name: "counts",
        type: "bool",
      },
    ],
  })
  @d.permission("roles")
  async rolesCmd(msg: Message, args: { search?: string; counts?: boolean }) {
    let roles: Array<{ _memberCount?: number } & Role> = Array.from((msg.channel as TextChannel).guild.roles.values());
    if (args.search) {
      const searchStr = args.search.toLowerCase();
      roles = roles.filter(r => r.name.toLowerCase().includes(searchStr) || r.id === searchStr);
    }

    if (args.counts) {
      // If the user requested role member counts as well, calculate them and sort the roles by their member count
      const roleCounts: Map<string, number> = Array.from(this.guild.members.values()).reduce((map, member) => {
        for (const roleId of member.roles) {
          if (!map.has(roleId)) map.set(roleId, 0);
          map.set(roleId, map.get(roleId) + 1);
        }

        return map;
      }, new Map());

      // The "everyone" role always has all members in it
      roleCounts.set(this.guildId, this.guild.memberCount);

      for (const role of roles) {
        role._memberCount = roleCounts.has(role.id) ? roleCounts.get(role.id) : 0;
      }

      roles.sort((a, b) => {
        if (a._memberCount > b._memberCount) return -1;
        if (a._memberCount < b._memberCount) return 1;
        return 0;
      });
    } else {
      // Otherwise sort by name
      roles.sort((a, b) => {
        if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
        if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
        return 0;
      });
    }

    const longestId = roles.reduce((longest, role) => Math.max(longest, role.id.length), 0);

    const chunks = chunkArray(roles, 20);
    for (const [i, chunk] of chunks.entries()) {
      const roleLines = chunk.map(role => {
        const paddedId = role.id.padEnd(longestId, " ");
        let line = `${paddedId} ${role.name}`;
        if (role._memberCount != null) {
          line += role._memberCount === 1 ? ` (${role._memberCount} member)` : ` (${role._memberCount} members)`;
        }
        return line;
      });

      if (i === 0) {
        msg.channel.createMessage(
          trimLines(`
          ${args.search ? "Total roles found" : "Total roles"}: ${roles.length}
          \`\`\`py\n${roleLines.join("\n")}\`\`\`
        `),
        );
      } else {
        msg.channel.createMessage("```py\n" + roleLines.join("\n") + "```");
      }
    }
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

  @d.command("search", "[query:string$]", {
    options: [
      {
        name: "page",
        type: "number",
      },
      {
        name: "role",
        type: "string",
      },
      {
        name: "voice",
        type: "bool",
      },
      {
        name: "sort",
        type: "string",
      },
    ],
  })
  @d.permission("search")
  async searchCmd(
    msg: Message,
    args: { query?: string; role?: string; page?: number; voice?: boolean; sort?: string },
  ) {
    let matchingMembers = Array.from(this.guild.members.values());

    if (args.role) {
      const roleIds = args.role.split(",");
      matchingMembers = matchingMembers.filter(member => {
        for (const role of roleIds) {
          if (!member.roles.includes(role)) return false;
        }

        return true;
      });
    }

    if (args.voice) {
      matchingMembers = matchingMembers.filter(m => m.voiceState.channelID != null);
    }

    if (args.query) {
      const query = args.query.toLowerCase();

      matchingMembers = matchingMembers.filter(member => {
        const fullUsername = `${member.user.username}#${member.user.discriminator}`;
        if (member.nick && member.nick.toLowerCase().indexOf(query) !== -1) return true;
        if (fullUsername.toLowerCase().indexOf(query) !== -1) return true;
        return false;
      });
    }

    if (matchingMembers.length > 0) {
      let header;
      const resultText = matchingMembers.length === 1 ? "result" : "results";

      const paginated = matchingMembers.length > MAX_SEARCH_RESULTS;

      const inputPage = args.page || 1;
      const lastPage = Math.ceil(matchingMembers.length / MAX_SEARCH_RESULTS);
      const page = Math.min(lastPage, Math.max(1, inputPage));

      const from = (page - 1) * MAX_SEARCH_RESULTS;
      const to = Math.min(from + MAX_SEARCH_RESULTS, matchingMembers.length);

      if (paginated) {
        header = `Found ${matchingMembers.length} ${resultText} (showing ${from + 1}-${to})`;
      } else {
        header = `Found ${matchingMembers.length} ${resultText}`;
      }

      const [, sortDir, sortBy] = args.sort ? args.sort.match(/^(-?)(.*)$/) : [null, "ASC", "name"];
      const realSortDir = sortDir === "-" ? "DESC" : "ASC";

      if (sortBy === "id") {
        matchingMembers.sort(sorter(m => BigInt(m.id), realSortDir));
      } else {
        matchingMembers.sort(
          multiSorter([[m => m.username.toLowerCase(), realSortDir], [m => m.discriminator, realSortDir]]),
        );
      }

      const pageMembers = matchingMembers.slice(from, to);

      const longestId = pageMembers.reduce((longest, member) => Math.max(longest, member.id.length), 0);
      const lines = pageMembers.map(member => {
        const paddedId = member.id.padEnd(longestId, " ");
        return `${paddedId} ${member.user.username}#${member.user.discriminator}`;
      });

      const footer = paginated ? "Use --page=n to browse results" : "";

      msg.channel.createMessage(`${header}\n\`\`\`js\n${lines.join("\n")}\`\`\`${footer}`);
    } else {
      msg.channel.createMessage(errorMessage("No results found"));
    }
  }

  async cleanMessages(channel: Channel, savedMessages: SavedMessage[], mod: User) {
    this.logs.ignoreLog(LogType.MESSAGE_DELETE, savedMessages[0].id);
    this.logs.ignoreLog(LogType.MESSAGE_DELETE_BULK, savedMessages[0].id);

    // Delete & archive in ID order
    savedMessages = Array.from(savedMessages).sort((a, b) => (a.id > b.id ? 1 : -1));
    const idsToDelete = savedMessages.map(m => m.id);

    // Make sure the deletions aren't double logged
    idsToDelete.forEach(id => this.logs.ignoreLog(LogType.MESSAGE_DELETE, id));
    this.logs.ignoreLog(LogType.MESSAGE_DELETE_BULK, idsToDelete[0]);

    // Actually delete the messages
    await this.bot.deleteMessages(channel.id, idsToDelete);
    await this.savedMessages.markBulkAsDeleted(idsToDelete);

    // Create an archive
    const archiveId = await this.archives.createFromSavedMessages(savedMessages, this.guild);
    const archiveUrl = this.archives.getUrl(this.knub.getGlobalConfig().url, archiveId);

    this.logs.log(LogType.CLEAN, {
      mod: stripObjectToScalars(mod),
      channel: stripObjectToScalars(channel),
      count: savedMessages.length,
      archiveUrl,
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
      successMessage(`Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`),
    );

    setTimeout(() => {
      msg.delete().catch(noop);
      responseMsg.delete().catch(noop);
    }, CLEAN_COMMAND_DELETE_DELAY);
  }

  @d.command("clean user", "<userId:userid> <count:number>")
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
      successMessage(`Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`),
    );

    setTimeout(() => {
      msg.delete().catch(noop);
      responseMsg.delete().catch(noop);
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
      successMessage(`Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`),
    );

    setTimeout(() => {
      msg.delete().catch(noop);
      responseMsg.delete().catch(noop);
    }, CLEAN_COMMAND_DELETE_DELAY);
  }

  @d.command("info", "<userId:userId>")
  @d.permission("info")
  async infoCmd(msg: Message, args: { userId: string }) {
    const embed: EmbedOptions = {
      fields: [],
    };

    const user = this.bot.users.get(args.userId);
    if (user) {
      const createdAt = moment(user.createdAt);
      const accountAge = humanizeDuration(moment().valueOf() - user.createdAt, {
        largest: 2,
        round: true,
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
        `) + embedPadding,
      });
    } else {
      embed.title = `Unknown user`;
    }

    const member = this.guild.members.get(args.userId);
    if (member) {
      const joinedAt = moment(member.joinedAt);
      const joinAge = humanizeDuration(moment().valueOf() - member.joinedAt, {
        largest: 2,
        round: true,
      });
      const roles = member.roles.map(id => this.guild.roles.get(id));

      embed.fields.push({
        name: "Member information",
        value:
          trimLines(`
          Joined: ${joinAge} ago (${joinedAt.format("YYYY-MM-DD[T]HH:mm:ss")})
          ${roles.length > 0 ? "Roles: " + roles.map(r => r.name).join(", ") : ""}
        `) + embedPadding,
      });
    }

    const cases = (await this.cases.getByUserId(args.userId)).filter(c => !c.is_hidden);

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
        `),
      });
    }

    msg.channel.createMessage({ embed });
  }

  @d.command(/(?:nickname|nick) reset/, "<target:member>")
  @d.permission("nickname")
  async nicknameResetCmd(msg: Message, args: { target: Member; nickname: string }) {
    if (msg.member.id !== args.target.id && !this.canActOn(msg.member, args.target)) {
      msg.channel.createMessage(errorMessage("Cannot reset nickname: insufficient permissions"));
      return;
    }

    try {
      await args.target.edit({
        nick: "",
      });
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to reset nickname"));
      return;
    }

    msg.channel.createMessage(successMessage(`Nickname of <@!${args.target.id}> is now reset`));
  }

  @d.command(/nickname|nick/, "<target:member> <nickname:string$>")
  @d.permission("nickname")
  async nicknameCmd(msg: Message, args: { target: Member; nickname: string }) {
    if (msg.member.id !== args.target.id && !this.canActOn(msg.member, args.target)) {
      msg.channel.createMessage(errorMessage("Cannot change nickname: insufficient permissions"));
      return;
    }

    const nicknameLength = [...args.nickname].length;
    if (nicknameLength < 2 || nicknameLength > 32) {
      msg.channel.createMessage(errorMessage("Nickname must be between 2 and 32 characters long"));
      return;
    }

    try {
      await args.target.edit({
        nick: args.nickname,
      });
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to change nickname"));
      return;
    }

    msg.channel.createMessage(successMessage(`Changed nickname of <@!${args.target.id}> to ${args.nickname}`));
  }

  @d.command("server")
  @d.permission("server")
  async serverCmd(msg: Message) {
    await this.guild.fetchAllMembers();

    const embed: EmbedOptions = {
      fields: [],
      color: parseInt("6b80cf", 16),
    };

    embed.thumbnail = { url: this.guild.iconURL };

    const createdAt = moment(this.guild.createdAt);
    const serverAge = humanizeDuration(moment().valueOf() - this.guild.createdAt, {
      largest: 2,
      round: true,
    });

    const owner = this.bot.users.get(this.guild.ownerID);
    const ownerName = owner ? `${owner.username}#${owner.discriminator}` : "Unknown#0000";

    embed.fields.push({
      name: `Server information - ${this.guild.name}`,
      value:
        trimLines(`
        Created: **${serverAge} ago** (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})
        Owner: **${ownerName}** (${this.guild.ownerID})
        Large: **${this.guild.large ? "yes" : "no"}**
        Voice region: **${this.guild.region}**
        ${this.guild.features.length > 0 ? "Features: " + this.guild.features.join(", ") : ""}
      `) + embedPadding,
    });

    const categories = this.guild.channels.filter(channel => channel instanceof CategoryChannel);
    const textChannels = this.guild.channels.filter(channel => channel instanceof TextChannel);
    const voiceChannels = this.guild.channels.filter(channel => channel instanceof VoiceChannel);

    embed.fields.push({
      name: "Counts",
      inline: true,
      value:
        trimLines(`
        Roles: **${this.guild.roles.size}**
        Categories: **${categories.length}**
        Text channels: **${textChannels.length}**
        Voice channels: **${voiceChannels.length}**
        Emojis: **${this.guild.emojis.length}**
      `) + embedPadding,
    });

    const onlineMembers = this.guild.members.filter(m => m.status === "online");
    const dndMembers = this.guild.members.filter(m => m.status === "dnd");
    const idleMembers = this.guild.members.filter(m => m.status === "idle");
    const offlineMembers = this.guild.members.filter(m => m.status === "offline");
    const notOfflineMembers = this.guild.members.filter(m => m.status !== "offline");

    embed.fields.push({
      name: "Members",
      inline: true,
      value: trimLines(`
        Total: **${this.guild.memberCount}**
        Online: **${onlineMembers.length}**
        Idle: **${idleMembers.length}**
        DND: **${dndMembers.length}**
        Offline: **${offlineMembers.length}**
        Not offline: **${notOfflineMembers.length}**
      `),
    });

    msg.channel.createMessage({ embed });
  }

  @d.command("ping")
  @d.permission("ping")
  async pingCmd(msg: Message) {
    const times = [];
    const messages: Message[] = [];
    let msgToMsgDelay = null;

    for (let i = 0; i < 4; i++) {
      const start = performance.now();
      const message = await msg.channel.createMessage(`Calculating ping... ${i + 1}`);
      times.push(performance.now() - start);
      messages.push(message);

      if (msgToMsgDelay === null) {
        msgToMsgDelay = message.timestamp - msg.timestamp;
      }
    }

    const highest = Math.round(Math.max(...times));
    const lowest = Math.round(Math.min(...times));
    const mean = Math.round(times.reduce((t, v) => t + v, 0) / times.length);

    msg.channel.createMessage(
      trimLines(`
      **Ping:**
      Lowest: **${lowest}ms**
      Highest: **${highest}ms**
      Mean: **${mean}ms**
      Time between ping command and first reply: **${msgToMsgDelay}ms**
    `),
    );

    // Clean up test messages
    this.bot.deleteMessages(messages[0].channel.id, messages.map(m => m.id)).catch(noop);
  }

  @d.command("source", "<messageId:string>")
  @d.permission("source")
  async sourceCmd(msg: Message, args: { messageId: string }) {
    const savedMessage = await this.savedMessages.find(args.messageId);
    if (!savedMessage) {
      msg.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    if (!savedMessage.data.content) {
      msg.channel.createMessage(errorMessage("Message content is empty"));
      return;
    }

    const archiveId = await this.archives.create(savedMessage.data.content, moment().add(1, "hour"));
    const url = this.archives.getUrl(this.knub.getGlobalConfig().url, archiveId);
    msg.channel.createMessage(`Message source: ${url}`);
  }

  @d.command("vcmove", "<member:Member> <channel:string$>")
  @d.permission("vcmove")
  async vcmoveCmd(msg: Message, args: { member: Member; channel: string }) {
    let channel: VoiceChannel;

    if (isSnowflake(args.channel)) {
      // Snowflake -> resolve channel directly
      const potentialChannel = this.guild.channels.get(args.channel);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        msg.channel.createMessage(errorMessage("Unknown or non-voice channel"));
        return;
      }

      channel = potentialChannel;
    } else if (channelMentionRegex.test(args.channel)) {
      // Channel mention -> parse channel id and resolve channel from that
      const channelId = args.channel.match(channelMentionRegex)[1];
      const potentialChannel = this.guild.channels.get(channelId);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        msg.channel.createMessage(errorMessage("Unknown or non-voice channel"));
        return;
      }

      channel = potentialChannel;
    } else {
      // Search string -> find closest matching voice channel name
      const voiceChannels = this.guild.channels.filter(theChannel => {
        return theChannel instanceof VoiceChannel;
      }) as VoiceChannel[];
      const closestMatch = simpleClosestStringMatch(args.channel, voiceChannels, ch => ch.name);
      if (!closestMatch) {
        msg.channel.createMessage(errorMessage("No matching voice channels"));
        return;
      }

      channel = closestMatch;
    }

    if (!args.member.voiceState || !args.member.voiceState.channelID) {
      msg.channel.createMessage(errorMessage("Member is not in a voice channel"));
      return;
    }

    try {
      await args.member.edit({
        channelID: channel.id,
      });
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to move member"));
      return;
    }

    msg.channel.createMessage(
      successMessage(`**${args.member.user.username}#${args.member.user.discriminator}** moved to **${channel.name}**`),
    );
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
