import { decorators as d, getCommandSignature, IPluginOptions, ICommandDefinition, waitForReaction } from "knub";
import {
  CategoryChannel,
  Channel,
  EmbedOptions,
  GuildChannel,
  Member,
  Message,
  MessageContent,
  Role,
  TextChannel,
  User,
  VoiceChannel,
} from "eris";
import {
  channelMentionRegex,
  chunkArray,
  createChunkedMessage,
  embedPadding,
  errorMessage,
  isSnowflake,
  MINUTES,
  multiSorter,
  noop,
  resolveMember,
  SECONDS,
  simpleClosestStringMatch,
  sleep,
  sorter,
  stripObjectToScalars,
  successMessage,
  trimLines,
  UnknownUser,
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
import { getCurrentUptime } from "../uptime";

import LCL from "last-commit-log";

const { performance } = require("perf_hooks");

const SEARCH_RESULTS_PER_PAGE = 15;
const MAX_CLEAN_COUNT = 50;
const CLEAN_COMMAND_DELETE_DELAY = 5000;
const MEMBER_REFRESH_FREQUENCY = 10 * 60 * 1000; // How often to do a full member refresh when using !search or !roles --counts

const activeReloads: Map<string, TextChannel> = new Map();

type MemberSearchParams = {
  query?: string;
  role?: string;
  voice?: boolean;
  sort?: string;
  "case-sensitive"?: boolean;
};

interface IUtilityPluginConfig {
  can_roles: boolean;
  can_level: boolean;
  can_search: boolean;
  can_clean: boolean;
  can_info: boolean;
  can_server: boolean;
  can_reload_guild: boolean;
  can_nickname: boolean;
  can_ping: boolean;
  can_source: boolean;
  can_vcmove: boolean;
  can_help: boolean;
  can_about: boolean;
}

export class UtilityPlugin extends ZeppelinPlugin<IUtilityPluginConfig> {
  public static pluginName = "utility";

  protected logs: GuildLogs;
  protected cases: GuildCases;
  protected savedMessages: GuildSavedMessages;
  protected archives: GuildArchives;

  protected lastFullMemberRefresh = 0;

  getDefaultOptions(): IPluginOptions<IUtilityPluginConfig> {
    return {
      config: {
        can_roles: false,
        can_level: false,
        can_search: false,
        can_clean: false,
        can_info: false,
        can_server: false,
        can_reload_guild: false,
        can_nickname: false,
        can_ping: false,
        can_source: false,
        can_vcmove: false,
        can_help: false,
        can_about: false,
      },
      overrides: [
        {
          level: ">=50",
          config: {
            can_roles: true,
            can_level: true,
            can_search: true,
            can_clean: true,
            can_info: true,
            can_server: true,
            can_nickname: true,
            can_vcmove: true,
            can_help: true,
          },
        },
        {
          level: ">=100",
          config: {
            can_reload_guild: true,
            can_ping: true,
            can_source: true,
            can_about: true,
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

  protected async refreshMembersIfNeeded() {
    if (Date.now() < this.lastFullMemberRefresh + MEMBER_REFRESH_FREQUENCY) return;
    await this.guild.fetchAllMembers();
    this.lastFullMemberRefresh = Date.now();
  }

  @d.command("roles", "[search:string$]", {
    options: [
      {
        name: "counts",
        type: "bool",
      },
      {
        name: "sort",
        type: "string",
      },
    ],
  })
  @d.permission("can_roles")
  async rolesCmd(msg: Message, args: { search?: string; counts?: boolean; sort?: string }) {
    let roles: Array<{ _memberCount?: number } & Role> = Array.from((msg.channel as TextChannel).guild.roles.values());
    let sort = args.sort;

    if (args.search) {
      const searchStr = args.search.toLowerCase();
      roles = roles.filter(r => r.name.toLowerCase().includes(searchStr) || r.id === searchStr);
    }

    if (args.counts) {
      this.refreshMembersIfNeeded();

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

      if (!sort) sort = "-memberCount";
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

    if (!sort) sort = "name";

    let sortDir: "ASC" | "DESC" = "ASC";
    if (sort && sort[0] === "-") {
      sort = sort.slice(1);
      sortDir = "DESC";
    }

    if (sort === "position" || sort === "order") {
      roles.sort(sorter("position", sortDir));
    } else if (sort === "memberCount" && args.counts) {
      roles.sort(sorter("_memberCount", sortDir));
    } else if (sort === "name") {
      roles.sort(sorter(r => r.name.toLowerCase(), sortDir));
    } else {
      this.sendErrorMessage(msg.channel, "Unknown sorting method");
      return;
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

  @d.command("level", "[member:resolvedMember]")
  @d.permission("can_level")
  async levelCmd(msg: Message, args: { member?: Member }) {
    const member = args.member || msg.member;
    const level = this.getMemberLevel(member);
    msg.channel.createMessage(`The permission level of ${member.username}#${member.discriminator} is **${level}**`);
  }

  protected async performMemberSearch(
    args: MemberSearchParams,
    page = 1,
    perPage = SEARCH_RESULTS_PER_PAGE,
  ): Promise<{ results: Member[]; totalResults: number; page: number; lastPage: number; from: number; to: number }> {
    this.refreshMembersIfNeeded();

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
      const query = args["case-sensitive"] ? args.query : args.query.toLowerCase();

      matchingMembers = matchingMembers.filter(member => {
        const nick = args["case-sensitive"] ? member.nick : member.nick && member.nick.toLowerCase();

        const fullUsername = args["case-sensitive"]
          ? `${member.user.username}#${member.user.discriminator}`
          : `${member.user.username}#${member.user.discriminator}`.toLowerCase();

        if (nick && nick.indexOf(query) !== -1) return true;
        if (fullUsername.indexOf(query) !== -1) return true;

        return false;
      });
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

    const lastPage = Math.ceil(matchingMembers.length / SEARCH_RESULTS_PER_PAGE);
    page = Math.min(lastPage, Math.max(1, page));

    const from = (page - 1) * SEARCH_RESULTS_PER_PAGE;
    const to = Math.min(from + SEARCH_RESULTS_PER_PAGE, matchingMembers.length);

    const pageMembers = matchingMembers.slice(from, to);

    return {
      results: pageMembers,
      totalResults: matchingMembers.length,
      page,
      lastPage,
      from: from + 1,
      to,
    };
  }

  @d.command("search", "[query:string$]", {
    aliases: ["s"],
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
      {
        name: "case-sensitive",
        type: "boolean",
        shortcut: "cs",
      },
      {
        name: "export",
        type: "boolean",
        shortcut: "e",
      },
    ],
  })
  @d.permission("can_search")
  async searchCmd(
    msg: Message,
    args: {
      query?: string;
      role?: string;
      page?: number;
      voice?: boolean;
      sort?: string;
      "case-sensitive"?: boolean;
      export?: boolean;
    },
  ) {
    const formatSearchResultLines = (members: Member[]) => {
      const longestId = members.reduce((longest, member) => Math.max(longest, member.id.length), 0);
      const lines = members.map(member => {
        const paddedId = member.id.padEnd(longestId, " ");
        let line = `${paddedId} ${member.user.username}#${member.user.discriminator}`;
        if (member.nick) line += ` (${member.nick})`;
        return line;
      });
      return lines;
    };

    // If we're exporting the results, we don't need all the fancy schmancy pagination stuff.
    // Just get the results and dump them in an archive.
    if (args.export) {
      const results = await this.performMemberSearch(args, 1, Infinity);
      if (results.totalResults === 0) {
        return this.sendErrorMessage(msg.channel, "No results found");
      }

      const resultLines = formatSearchResultLines(results.results);
      const archiveId = await this.archives.create(
        trimLines(`
        Search results (total ${results.totalResults}):

        ${resultLines.join("\n")}
      `),
        moment().add(1, "hour"),
      );
      const url = await this.archives.getUrl(this.knub.getGlobalConfig().url, archiveId);

      msg.channel.createMessage(`Exported search results: ${url}`);

      return;
    }

    // If we're not exporting, load 1 page of search results at a time and allow the user to switch pages with reactions
    let originalSearchMsg: Message = null;
    let searching = false;
    let currentPage = args.page || 1;
    let hasReactions = false;
    let clearReactionsFn = null;
    let clearReactionsTimeout = null;

    const loadSearchPage = async page => {
      if (searching) return;
      searching = true;

      // The initial message is created here, as well as edited to say "Searching..." on subsequent requests
      // We don't "await" this so we can start loading the search results immediately instead of after the message has been created/edited
      let searchMsgPromise: Promise<Message>;
      if (originalSearchMsg) {
        searchMsgPromise = originalSearchMsg.edit("Searching...");
      } else {
        searchMsgPromise = msg.channel.createMessage("Searching...");
        searchMsgPromise.then(m => (originalSearchMsg = m));
      }

      const searchResult = await this.performMemberSearch(args, page, SEARCH_RESULTS_PER_PAGE);
      if (searchResult.totalResults === 0) {
        return this.sendErrorMessage(msg.channel, "No results found");
      }

      const resultWord = searchResult.totalResults === 1 ? "matching member" : "matching members";
      const headerText =
        searchResult.totalResults > SEARCH_RESULTS_PER_PAGE
          ? trimLines(`
            **Page ${searchResult.page}** (${searchResult.from}-${searchResult.to}) (total ${searchResult.totalResults})
          `)
          : `Found ${searchResult.totalResults} ${resultWord}`;
      const lines = formatSearchResultLines(searchResult.results);
      const result = trimLines(`
        ${headerText}
        \`\`\`js
        ${lines.join("\n")}
        \`\`\`
      `);

      const searchMsg = await searchMsgPromise;
      searchMsg.edit(result);

      // Set up pagination reactions if needed. The reactions are cleared after a timeout.
      if (searchResult.totalResults > SEARCH_RESULTS_PER_PAGE) {
        if (!hasReactions) {
          hasReactions = true;
          searchMsg.addReaction("⬅");
          searchMsg.addReaction("➡");
          searchMsg.addReaction("🔄");

          const removeListenerFn = this.on("messageReactionAdd", (rMsg: Message, emoji, userId) => {
            if (userId !== msg.author.id) return;
            if (!["⬅", "➡", "🔄"].includes(emoji.name)) return;

            if (emoji.name === "⬅" && currentPage > 1) {
              loadSearchPage(currentPage - 1);
            } else if (emoji.name === "➡" && currentPage < searchResult.lastPage) {
              loadSearchPage(currentPage + 1);
            } else if (emoji.name === "🔄") {
              loadSearchPage(currentPage);
            }

            rMsg.removeReaction(emoji.name, userId);
          });

          clearReactionsFn = async () => {
            searchMsg.removeReactions();
            removeListenerFn();
          };
        }

        clearTimeout(clearReactionsTimeout);
        clearReactionsTimeout = setTimeout(clearReactionsFn, 5 * MINUTES);
      }

      currentPage = searchResult.page;
      searching = false;
    };

    loadSearchPage(currentPage);
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

  @d.command("clean", "<count:number>", {
    aliases: ["clean all"],
  })
  @d.permission("can_clean")
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
  @d.permission("can_clean")
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
  @d.permission("can_clean")
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

  @d.command("info", "[user:resolvedUserLoose]")
  @d.permission("can_info")
  async infoCmd(msg: Message, args: { user?: User | UnknownUser }) {
    const user = args.user || msg.author;

    let member;
    if (!(user instanceof UnknownUser)) {
      member = await this.getMember(user.id);
    }

    const embed: EmbedOptions = {
      fields: [],
    };

    if (user && !(user instanceof UnknownUser)) {
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
          ID: **${user.id}**
          Profile: <@!${user.id}>
          Created: **${accountAge} ago (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})**
        `) + embedPadding,
      });
    } else {
      embed.title = `Unknown user`;
    }

    if (member) {
      const joinedAt = moment(member.joinedAt);
      const joinAge = humanizeDuration(moment().valueOf() - member.joinedAt, {
        largest: 2,
        round: true,
      });
      const roles = member.roles.map(id => this.guild.roles.get(id)).filter(r => !!r);

      embed.fields.push({
        name: "Member information",
        value:
          trimLines(`
          Joined: **${joinAge} ago (${joinedAt.format("YYYY-MM-DD[T]HH:mm:ss")})**
          ${roles.length > 0 ? "Roles: " + roles.map(r => r.name).join(", ") : ""}
        `) + embedPadding,
      });

      const voiceChannel = member.voiceState.channelID ? this.guild.channels.get(member.voiceState.channelID) : null;
      if (voiceChannel || member.voiceState.mute || member.voiceState.deaf) {
        embed.fields.push({
          name: "Voice information",
          value:
            trimLines(`
          ${voiceChannel ? `Current voice channel: **${voiceChannel ? voiceChannel.name : "None"}**` : ""}
          ${member.voiceState.mute ? "Server voice muted: **Yes**" : ""}
          ${member.voiceState.deaf ? "Server voice deafened: **Yes**" : ""}
        `) + embedPadding,
        });
      }
    } else {
      embed.fields.push({
        name: "!!  USER IS NOT ON THE SERVER  !!",
        value: embedPadding,
      });
    }

    const cases = (await this.cases.getByUserId(user.id)).filter(c => !c.is_hidden);

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
          Total cases: **${cases.length}**
          ${summaryText}: ${caseSummary.join(", ")}
        `),
      });
    }

    msg.channel.createMessage({ embed });
  }

  @d.command(/(?:nickname|nick) reset/, "<member:resolvedMember>")
  @d.permission("can_nickname")
  async nicknameResetCmd(msg: Message, args: { member: Member }) {
    if (msg.member.id !== args.member.id && !this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot reset nickname: insufficient permissions"));
      return;
    }

    try {
      await args.member.edit({
        nick: "",
      });
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to reset nickname"));
      return;
    }

    msg.channel.createMessage(successMessage(`The nickname of <@!${args.member.id}> has been reset`));
  }

  @d.command(/nickname|nick/, "<member:resolvedMember> <nickname:string$>")
  @d.permission("can_nickname")
  async nicknameCmd(msg: Message, args: { member: Member; nickname: string }) {
    if (msg.member.id !== args.member.id && !this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot change nickname: insufficient permissions"));
      return;
    }

    const nicknameLength = [...args.nickname].length;
    if (nicknameLength < 2 || nicknameLength > 32) {
      msg.channel.createMessage(errorMessage("Nickname must be between 2 and 32 characters long"));
      return;
    }

    const oldNickname = args.member.nick || "<none>";

    try {
      await args.member.edit({
        nick: args.nickname,
      });
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to change nickname"));
      return;
    }

    msg.channel.createMessage(
      successMessage(`Changed nickname of <@!${args.member.id}> from **${oldNickname}** to **${args.nickname}**`),
    );
  }

  @d.command("server")
  @d.permission("can_server")
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
        Voice region: **${this.guild.region}**
        ${this.guild.features.length > 0 ? "Features: " + this.guild.features.join(", ") : ""}
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

    const categories = this.guild.channels.filter(channel => channel instanceof CategoryChannel);
    const textChannels = this.guild.channels.filter(channel => channel instanceof TextChannel);
    const voiceChannels = this.guild.channels.filter(channel => channel instanceof VoiceChannel);

    embed.fields.push({
      name: "Other stats",
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

    msg.channel.createMessage({ embed });
  }

  @d.command("ping")
  @d.permission("can_ping")
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

    const shard = this.bot.shards.get(this.bot.guildShardMap[this.guildId]);

    msg.channel.createMessage(
      trimLines(`
      **Ping:**
      Lowest: **${lowest}ms**
      Highest: **${highest}ms**
      Mean: **${mean}ms**
      Time between ping command and first reply: **${msgToMsgDelay}ms**
      Shard latency: **${shard.latency}ms**
    `),
    );

    // Clean up test messages
    this.bot.deleteMessages(messages[0].channel.id, messages.map(m => m.id)).catch(noop);
  }

  @d.command("source", "<messageId:string>")
  @d.permission("can_source")
  async sourceCmd(msg: Message, args: { messageId: string }) {
    const savedMessage = await this.savedMessages.find(args.messageId);
    if (!savedMessage) {
      msg.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    const source =
      (savedMessage.data.content || "<no text content>") + "\n\nSource:\n\n" + JSON.stringify(savedMessage.data);

    const archiveId = await this.archives.create(source, moment().add(1, "hour"));
    const url = this.archives.getUrl(this.knub.getGlobalConfig().url, archiveId);
    msg.channel.createMessage(`Message source: ${url}`);
  }

  @d.command("vcmove", "<member:resolvedMember> <channel:string$>")
  @d.permission("can_vcmove")
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

    if (args.member.voiceState.channelID === channel.id) {
      msg.channel.createMessage(errorMessage("Member is already on that channel!"));
      return;
    }

    const oldVoiceChannel = this.guild.channels.get(args.member.voiceState.channelID);

    try {
      await args.member.edit({
        channelID: channel.id,
      });
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to move member"));
      return;
    }

    this.logs.log(LogType.VOICE_CHANNEL_FORCE_MOVE, {
      mod: stripObjectToScalars(msg.author),
      member: stripObjectToScalars(args.member, ["user", "roles"]),
      oldChannel: stripObjectToScalars(oldVoiceChannel),
      newChannel: stripObjectToScalars(channel),
    });

    msg.channel.createMessage(
      successMessage(`**${args.member.user.username}#${args.member.user.discriminator}** moved to **${channel.name}**`),
    );
  }

  @d.command("help", "<command:string$>")
  @d.permission("can_help")
  helpCmd(msg: Message, args: { command: string }) {
    const searchStr = args.command.toLowerCase();

    const matchingCommands: ICommandDefinition[] = [];

    const guildData = this.knub.getGuildData(this.guildId);
    for (const plugin of guildData.loadedPlugins.values()) {
      if (!(plugin instanceof ZeppelinPlugin)) continue;

      const commands = plugin.getRegisteredCommands();
      for (const command of commands) {
        const trigger = command.trigger.source.toLowerCase();
        if (trigger.startsWith(searchStr)) {
          matchingCommands.push(command);
        }
      }
    }

    const totalResults = matchingCommands.length;
    const limitedResults = matchingCommands.slice(0, 15);
    const signatures = limitedResults.map(command => {
      return (
        "`" +
        getCommandSignature(
          guildData.config.prefix,
          command.trigger.source,
          command.parameters,
          command.config.options,
        ) +
        "`"
      );
    });

    if (totalResults === 0) {
      msg.channel.createMessage("No matching commands found!");
      return;
    }

    let message =
      totalResults !== limitedResults.length
        ? `Results (${totalResults} total, showing first ${limitedResults.length}):`
        : `Results:`;

    message += `\n\n${signatures.join("\n")}`;
    createChunkedMessage(msg.channel, message);
  }

  @d.command("about")
  @d.permission("can_about")
  async aboutCmd(msg: Message) {
    const uptime = getCurrentUptime();
    const prettyUptime = humanizeDuration(uptime, { largest: 2, round: true });

    const lcl = new LCL();
    const lastCommit = await lcl.getLastCommit();

    const shard = this.bot.shards.get(this.bot.guildShardMap[this.guildId]);

    const basicInfoRows = [
      ["Uptime", prettyUptime],
      ["Last update", moment(lastCommit.committer.date, "X").format("LL [at] H:mm [(UTC)]")],
      ["Version", lastCommit.shortHash],
      ["API latency", `${shard.latency}ms`],
    ];

    const loadedPlugins = Array.from(this.knub.getGuildData(this.guildId).loadedPlugins.keys());
    loadedPlugins.sort();

    const aboutContent: MessageContent = {
      embed: {
        title: `About ${this.bot.user.username}`,
        fields: [
          {
            name: "Basic info",
            value:
              basicInfoRows
                .map(([label, value]) => {
                  return `${label}: **${value}**`;
                })
                .join("\n") + embedPadding,
          },
          {
            name: `Loaded plugins on this server (${loadedPlugins.length})`,
            value: loadedPlugins.join(", "),
          },
        ],
      },
    };

    // For the embed color, find the highest colored role the bot has - this is their color on the server as well
    const botMember = await resolveMember(this.bot, this.guild, this.bot.user.id);
    let botRoles = botMember.roles.map(r => (msg.channel as GuildChannel).guild.roles.get(r));
    botRoles = botRoles.filter(r => !!r); // Drop any unknown roles
    botRoles = botRoles.filter(r => r.color); // Filter to those with a color
    botRoles.sort(sorter("position", "DESC")); // Sort by position (highest first)
    if (botRoles.length) {
      aboutContent.embed.color = botRoles[0].color;
    }

    // Use the bot avatar as the embed image
    if (this.bot.user.avatarURL) {
      aboutContent.embed.thumbnail = { url: this.bot.user.avatarURL };
    }

    msg.channel.createMessage(aboutContent);
  }

  @d.command("reload_guild")
  @d.permission("can_reload_guild")
  reloadGuildCmd(msg: Message) {
    if (activeReloads.has(this.guildId)) return;
    activeReloads.set(this.guildId, msg.channel as TextChannel);

    msg.channel.createMessage("Reloading...");
    this.knub.reloadGuild(this.guildId);
  }
}
