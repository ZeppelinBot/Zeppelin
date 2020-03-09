import {
  decorators as d,
  getCommandSignature,
  ICommandContext,
  ICommandExtraData,
  IPluginOptions,
  waitForReaction,
} from "knub";
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
  DAYS,
  embedPadding,
  errorMessage,
  formatNumber,
  get,
  getInviteCodesInString,
  isSnowflake,
  messageLink,
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
  downloadFile,
  memoize,
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
import { CommandInfo, trimPluginDescription, ZeppelinPlugin } from "./ZeppelinPlugin";
import { getCurrentUptime } from "../uptime";
import LCL from "last-commit-log";
import * as t from "io-ts";
import { ICommandDefinition } from "knub-command-manager";
import path from "path";
import escapeStringRegexp from "escape-string-regexp";
import safeRegex from "safe-regex";
import fs from "fs";
import sharp from "sharp";
import twemoji from "twemoji";

declare global {
  // This is here so TypeScript doesn't give an error when importing twemoji
  // since one of the signatures of twemoji.parse() takes an HTMLElement but
  // we're not in a browser environment so including the DOM lib would not make
  // sense
  type HTMLElement = unknown;
}

import { Url, URL, URLSearchParams } from "url";
const ConfigSchema = t.type({
  can_roles: t.boolean,
  can_level: t.boolean,
  can_search: t.boolean,
  can_clean: t.boolean,
  can_info: t.boolean,
  can_server: t.boolean,
  can_reload_guild: t.boolean,
  can_nickname: t.boolean,
  can_ping: t.boolean,
  can_source: t.boolean,
  can_vcmove: t.boolean,
  can_help: t.boolean,
  can_about: t.boolean,
  can_context: t.boolean,
  can_jumbo: t.boolean,
  jumbo_size: t.Integer,
  can_avatar: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

const { performance } = require("perf_hooks");

const SEARCH_RESULTS_PER_PAGE = 15;
const SEARCH_ID_RESULTS_PER_PAGE = 50;

const MAX_CLEAN_COUNT = 150;
const MAX_CLEAN_TIME = 1 * DAYS;
const CLEAN_COMMAND_DELETE_DELAY = 5 * SECONDS;
const MEMBER_REFRESH_FREQUENCY = 10 * MINUTES; // How often to do a full member refresh when using commands that need it
const SEARCH_EXPORT_LIMIT = 1_000_000;

const activeReloads: Map<string, TextChannel> = new Map();
const fsp = fs.promises;
const CDN_URL = "https://twemoji.maxcdn.com/2/svg";

type MemberSearchParams = {
  query?: string;
  role?: string;
  voice?: boolean;
  bot?: boolean;
  sort?: string;
  "case-sensitive"?: boolean;
  regex?: boolean;
  "status-search"?: boolean;
};

class SearchError extends Error {}

export class UtilityPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "utility";
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Utility",
  };

  protected logs: GuildLogs;
  protected cases: GuildCases;
  protected savedMessages: GuildSavedMessages;
  protected archives: GuildArchives;

  protected lastFullMemberRefresh = 0;
  protected fullMemberRefreshPromise;
  protected lastReload;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
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
        can_context: false,
        can_jumbo: false,
        jumbo_size: 128,
        can_avatar: false,
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
            can_context: true,
            can_jumbo: true,
            can_avatar: true,
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
    this.cases = GuildCases.getGuildInstance(this.guildId);
    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.archives = GuildArchives.getGuildInstance(this.guildId);

    this.lastReload = Date.now();

    if (activeReloads && activeReloads.has(this.guildId)) {
      this.sendSuccessMessage(activeReloads.get(this.guildId), "Reloaded!");
      activeReloads.delete(this.guildId);
    }
  }

  protected async refreshMembersIfNeeded() {
    if (Date.now() < this.lastFullMemberRefresh + MEMBER_REFRESH_FREQUENCY) {
      return this.fullMemberRefreshPromise;
    }

    this.lastFullMemberRefresh = Date.now();
    this.fullMemberRefreshPromise = this.guild.fetchAllMembers();

    return this.fullMemberRefreshPromise;
  }

  @d.command("roles", "[search:string$]", {
    options: [
      {
        name: "counts",
        isSwitch: true,
      },
      {
        name: "sort",
        type: "string",
      },
    ],
    extra: {
      info: <CommandInfo>{
        description: "List all roles or roles matching a search",
        basicUsage: "!roles mod",
      },
    },
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

  @d.command("level", "[member:resolvedMember]", {
    extra: {
      info: <CommandInfo>{
        description: "Show the permission level of a user",
        basicUsage: "!level 106391128718245888",
      },
    },
  })
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

    if (args.bot) {
      matchingMembers = matchingMembers.filter(m => m.bot);
    }

    if (args.query) {
      let queryRegex: RegExp;
      if (args.regex) {
        queryRegex = new RegExp(args.query.trimStart(), args["case-sensitive"] ? "" : "i");
      } else {
        queryRegex = new RegExp(escapeStringRegexp(args.query.trimStart()), args["case-sensitive"] ? "" : "i");
      }

      if (!safeRegex(queryRegex)) {
        throw new SearchError("Unsafe/too complex regex (star depth is limited to 1)");
      }

      if (args["status-search"]) {
        matchingMembers = matchingMembers.filter(member => {
          if (member.game) {
            if (member.game.name && member.game.name.match(queryRegex)) return true;
            if (member.game.state && member.game.state.match(queryRegex)) return true;
            if (member.game.details && member.game.details.match(queryRegex)) return true;
            if (
              member.game.assets &&
              (member.game.assets.small_text.match(queryRegex) || member.game.assets.large_text.match(queryRegex))
            )
              return true;
            if (member.game.emoji && member.game.emoji.name.match(queryRegex)) return true;
          }
          return false;
        });
      } else {
        matchingMembers = matchingMembers.filter(member => {
          if (member.nick && member.nick.match(queryRegex)) return true;

          const fullUsername = `${member.user.username}#${member.user.discriminator}`;
          if (fullUsername.match(queryRegex)) return true;

          return false;
        });
      }
    }

    const [, sortDir, sortBy] = args.sort ? args.sort.match(/^(-?)(.*)$/) : [null, "ASC", "name"];
    const realSortDir = sortDir === "-" ? "DESC" : "ASC";

    if (sortBy === "id") {
      matchingMembers.sort(sorter(m => BigInt(m.id), realSortDir));
    } else {
      matchingMembers.sort(
        multiSorter([
          [m => m.username.toLowerCase(), realSortDir],
          [m => m.discriminator, realSortDir],
        ]),
      );
    }

    const lastPage = Math.max(1, Math.ceil(matchingMembers.length / perPage));
    page = Math.min(lastPage, Math.max(1, page));

    const from = (page - 1) * perPage;
    const to = Math.min(from + perPage, matchingMembers.length);

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
        shortcut: "p",
        type: "number",
      },
      {
        name: "role",
        shortcut: "r",
        type: "string",
      },
      {
        name: "voice",
        shortcut: "v",
        isSwitch: true,
      },
      {
        name: "bot",
        shortcut: "b",
        isSwitch: true,
      },
      {
        name: "sort",
        type: "string",
      },
      {
        name: "case-sensitive",
        shortcut: "cs",
        isSwitch: true,
      },
      {
        name: "export",
        shortcut: "e",
        isSwitch: true,
      },
      {
        name: "ids",
        isSwitch: true,
      },
      {
        name: "regex",
        shortcut: "re",
        isSwitch: true,
      },
      {
        name: "status-search",
        shortcut: "ss",
        isSwitch: true,
      },
    ],
    extra: {
      info: <CommandInfo>{
        description: "Search server members",
        basicUsage: "!search dragory",
        optionDescriptions: {
          role:
            "Only include members with a specific role. Multiple roles can be specified by separating them with a comma.",
          voice: "Only include members currently in a voice channel",
          sort:
            "Change how the results are sorted. Possible values are 'id' and 'name'. Prefix with a dash, e.g. '-id', to reverse sorting.",
          "case-sensitive": "By default, the search is case-insensitive. Use this to make it case-sensitive instead.",
          export: "If set, the full search results are exported as an archive",
        },
      },
    },
  })
  @d.permission("can_search")
  async searchCmd(
    msg: Message,
    args: {
      query?: string;
      page?: number;
      role?: string;
      voice?: boolean;
      bot?: boolean;
      sort?: string;
      "case-sensitive"?: boolean;
      export?: boolean;
      ids?: boolean;
      regex?: boolean;
      "status-search"?: boolean;
    },
  ) {
    const formatSearchResultList = (members: Member[]): string => {
      const longestId = members.reduce((longest, member) => Math.max(longest, member.id.length), 0);
      const lines = members.map(member => {
        const paddedId = member.id.padEnd(longestId, " ");
        let line = `${paddedId} ${member.user.username}#${member.user.discriminator}`;
        if (member.nick) line += ` (${member.nick})`;
        return line;
      });
      return lines.join("\n");
    };

    const formatSearchResultIdList = (members: Member[]): string => {
      return members.map(m => m.id).join(" ");
    };

    // If we're exporting the results, we don't need all the fancy schmancy pagination stuff.
    // Just get the results and dump them in an archive.
    if (args.export) {
      let results;
      try {
        results = await this.performMemberSearch(args, 1, SEARCH_EXPORT_LIMIT);
      } catch (e) {
        if (e instanceof SearchError) {
          return this.sendErrorMessage(msg.channel, e.message);
        }

        throw e;
      }

      if (results.totalResults === 0) {
        return this.sendErrorMessage(msg.channel, "No results found");
      }

      const resultList = args.ids ? formatSearchResultIdList(results.results) : formatSearchResultList(results.results);

      const archiveId = await this.archives.create(
        trimLines(`
        Search results (total ${results.totalResults}):

        ${resultList}
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

    const perPage = args.ids ? SEARCH_ID_RESULTS_PER_PAGE : SEARCH_RESULTS_PER_PAGE;

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

      let searchResult;
      try {
        searchResult = await this.performMemberSearch(args, page, perPage);
      } catch (e) {
        if (e instanceof SearchError) {
          return this.sendErrorMessage(msg.channel, e.message);
        }

        throw e;
      }

      if (searchResult.totalResults === 0) {
        return this.sendErrorMessage(msg.channel, "No results found");
      }

      const resultWord = searchResult.totalResults === 1 ? "matching member" : "matching members";
      const headerText =
        searchResult.totalResults > perPage
          ? trimLines(`
            **Page ${searchResult.page}** (${searchResult.from}-${searchResult.to}) (total ${searchResult.totalResults})
          `)
          : `Found ${searchResult.totalResults} ${resultWord}`;

      const resultList = args.ids
        ? formatSearchResultIdList(searchResult.results)
        : formatSearchResultList(searchResult.results);

      const result = trimLines(`
        ${headerText}
        \`\`\`js
        ${resultList}
        \`\`\`
      `);

      const searchMsg = await searchMsgPromise;
      searchMsg.edit(result);

      // Set up pagination reactions if needed. The reactions are cleared after a timeout.
      if (searchResult.totalResults > perPage) {
        if (!hasReactions) {
          hasReactions = true;
          searchMsg.addReaction("⬅");
          searchMsg.addReaction("➡");
          searchMsg.addReaction("🔄");

          const removeListenerFn = this.on("messageReactionAdd", (rMsg: Message, emoji, userId) => {
            if (rMsg.id !== searchMsg.id) return;
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
            searchMsg.removeReactions().catch(noop);
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

    return { archiveUrl };
  }

  @d.command("clean", "<count:number>", {
    options: [
      {
        name: "user",
        type: "userId",
        shortcut: "u",
      },
      {
        name: "channel",
        type: "channelId",
        shortcut: "c",
      },
      {
        name: "bots",
        isSwitch: true,
        shortcut: "b",
      },
      {
        name: "has-invites",
        isSwitch: true,
        shortcut: "i",
      },
    ],
    extra: {
      info: <CommandInfo>{
        description: "Remove a number of recent messages",
        basicUsage: "!clean 20",
        examples: trimPluginDescription(`
          To clean 20 messages from a specific user:  
          \`!clean -user 106391128718245888 20\`
          
          To clean messages from another channel:
          \`!clean -channel #other-channel 20\`
        `),
        parameterDescriptions: {
          count: "Number of messages to remove",
        },
        optionDescriptions: {
          user: "Only remove messages from the specified user",
          channel:
            "By default, messages are removed from the channel where the command is used. You can clean a different channel by specifying it with this option.",
          bots: "Only remove messages sent by bots",
          "has-invites": "Only remove messages that contain invites",
        },
      },
    },
  })
  @d.permission("can_clean")
  async cleanCmd(
    msg: Message,
    args: {
      count: number;
      user?: string;
      channel?: string;
      bots?: boolean;
      "has-invites"?: boolean;
      fresh?: boolean;
    },
  ) {
    if (args.count > MAX_CLEAN_COUNT || args.count <= 0) {
      msg.channel.createMessage(errorMessage(`Clean count must be between 1 and ${MAX_CLEAN_COUNT}`));
      return;
    }

    const targetChannel = args.channel ? this.guild.channels.get(args.channel) : msg.channel;
    if (!targetChannel || !(targetChannel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage(`Invalid channel specified`));
      return;
    }

    if (targetChannel.id !== msg.channel.id) {
      const configForTargetChannel = this.getConfigForMemberIdAndChannelId(msg.member.id, targetChannel.id);
      if (configForTargetChannel.can_clean !== true) {
        msg.channel.createMessage(errorMessage(`Missing permissions to use clean on that channel`));
        return;
      }
    }

    const messagesToClean = [];
    let beforeId = msg.id;
    const timeCutoff = msg.timestamp - MAX_CLEAN_TIME;

    while (messagesToClean.length < args.count) {
      const potentialMessagesToClean = await this.savedMessages.getLatestByChannelBeforeId(
        targetChannel.id,
        beforeId,
        args.count,
      );
      if (potentialMessagesToClean.length === 0) break;

      const filtered = potentialMessagesToClean.filter(message => {
        if (args.user && message.user_id !== args.user) return false;
        if (args.bots && !message.is_bot) return false;
        if (args["has-invites"] && getInviteCodesInString(message.data.content || "").length === 0) return false;
        if (moment.utc(message.posted_at).valueOf() < timeCutoff) return false;
        return true;
      });
      const remaining = args.count - messagesToClean.length;
      const withoutOverflow = filtered.slice(0, remaining);
      messagesToClean.push(...withoutOverflow);

      beforeId = potentialMessagesToClean[potentialMessagesToClean.length - 1].id;

      if (moment.utc(potentialMessagesToClean[potentialMessagesToClean.length - 1].posted_at).valueOf() < timeCutoff) {
        break;
      }
    }

    let responseMsg: Message;
    if (messagesToClean.length > 0) {
      const cleanResult = await this.cleanMessages(targetChannel, messagesToClean, msg.author);

      let responseText = `Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`;
      if (targetChannel.id !== msg.channel.id) {
        responseText += ` in <#${targetChannel.id}>\n${cleanResult.archiveUrl}`;
      }

      responseMsg = await msg.channel.createMessage(successMessage(`<:zep_check:650361014180904971>`, responseText));
    } else {
      responseMsg = await msg.channel.createMessage(errorMessage(`Found no messages to clean!`));
    }

    if (targetChannel.id === msg.channel.id) {
      // Delete the !clean command and the bot response if a different channel wasn't specified
      // (so as not to spam the cleaned channel with the command itself)
      setTimeout(() => {
        msg.delete().catch(noop);
        responseMsg.delete().catch(noop);
      }, CLEAN_COMMAND_DELETE_DELAY);
    }
  }

  @d.command("info", "[user:resolvedUserLoose]", {
    extra: {
      info: <CommandInfo>{
        description: "Show basic information about a user",
        basicUsage: "!info 106391128718245888",
      },
    },
    options: [
      {
        name: "compact",
        shortcut: "c",
        isSwitch: true,
      },
    ],
  })
  @d.permission("can_info")
  async infoCmd(msg: Message, args: { user?: User | UnknownUser; compact?: boolean }) {
    const user = args.user || msg.author;

    let member;
    if (!(user instanceof UnknownUser)) {
      member = await this.getMember(user.id, true);
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

      if (args.compact) {
        embed.fields.push({
          name: "User information",
          value: trimLines(`
            Profile: <@!${user.id}>
            Created: **${accountAge} ago (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})**
            `),
        });
        if (member) {
          const joinedAt = moment(member.joinedAt);
          const joinAge = humanizeDuration(moment().valueOf() - member.joinedAt, {
            largest: 2,
            round: true,
          });
          embed.fields[0].value += `\nJoined: **${joinAge} ago (${joinedAt.format("YYYY-MM-DD[T]HH:mm:ss")})**`;
        } else {
          embed.fields.push({
            name: "!!  USER IS NOT ON THE SERVER  !!",
            value: embedPadding,
          });
        }
        msg.channel.createMessage({ embed });
        return;
      } else {
        embed.fields.push({
          name: "User information",
          value:
            trimLines(`
            ID: **${user.id}**
            Profile: <@!${user.id}>
            Created: **${accountAge} ago (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})**
            `) + embedPadding,
        });
      }
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

  @d.command("nickname reset", "<member:resolvedMember>", {
    aliases: ["nick reset"],
    extra: {
      info: <CommandInfo>{
        description: "Reset a member's nickname to their username",
        basicUsage: "!nickname reset 106391128718245888",
      },
    },
  })
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

    this.sendSuccessMessage(msg.channel, `The nickname of <@!${args.member.id}> has been reset`);
  }

  @d.command("nickname", "<member:resolvedMember> <nickname:string$>", {
    aliases: ["nick"],
    extra: {
      info: <CommandInfo>{
        description: "Set a member's nickname",
        basicUsage: "!nickname 106391128718245888 Drag",
      },
    },
  })
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

    this.sendSuccessMessage(
      msg.channel,
      `Changed nickname of <@!${args.member.id}> from **${oldNickname}** to **${args.nickname}**`,
    );
  }

  @d.command("server", "", {
    extra: {
      info: <CommandInfo>{
        description: "Show information about the server",
        basicUsage: "!server",
      },
    },
  })
  @d.permission("can_server")
  async serverCmd(msg: Message) {
    await this.refreshMembersIfNeeded();

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

    const restGuild = await memoize(
      () => this.bot.getRESTGuild(this.guildId),
      `getRESTGuild_${this.guildId}`,
      10 * MINUTES,
    );

    // For servers with a vanity URL, we can use the numbers from the invite for online count
    // (which is nowadays usually more accurate for large servers)
    const invite = this.guild.vanityURL
      ? await memoize(
          () => this.bot.getInvite(this.guild.vanityURL, true),
          `getInvite_${this.guild.vanityURL}`,
          10 * MINUTES,
        )
      : null;

    const totalMembers = invite ? invite.memberCount : this.guild.memberCount;

    const onlineMemberCount = invite
      ? invite.presenceCount
      : this.guild.members.filter(m => m.status !== "offline").length;
    const offlineMemberCount = this.guild.memberCount - onlineMemberCount;

    const onlineStatusMemberCount = this.guild.members.filter(m => m.status === "online").length;
    const dndStatusMemberCount = this.guild.members.filter(m => m.status === "dnd").length;
    const idleStatusMemberCount = this.guild.members.filter(m => m.status === "idle").length;

    let memberCountTotalLines = `Total: **${formatNumber(totalMembers)}**`;
    if (restGuild.maxMembers) {
      memberCountTotalLines += `\nMax: **${formatNumber(restGuild.maxMembers)}**`;
    }

    let memberCountOnlineLines = `Online: **${formatNumber(onlineMemberCount)}**`;
    if (restGuild.maxPresences) {
      memberCountOnlineLines += `\nMax online: **${formatNumber(restGuild.maxPresences)}**`;
    }

    embed.fields.push({
      name: "Members",
      inline: true,
      value: trimLines(`
        ${memberCountTotalLines}
        ${memberCountOnlineLines}
        Offline: **${formatNumber(offlineMemberCount)}**
        <:zep_online:665907874450636810> Online: **${formatNumber(onlineStatusMemberCount)}**
        <:zep_idle:665908128331726848> Idle: **${formatNumber(idleStatusMemberCount)}**
        <:zep_dnd:665908138741858365> DND: **${formatNumber(dndStatusMemberCount)}**
      `),
    });

    const totalChannels = this.guild.channels.size;
    const categories = this.guild.channels.filter(channel => channel instanceof CategoryChannel);
    const textChannels = this.guild.channels.filter(channel => channel instanceof TextChannel);
    const voiceChannels = this.guild.channels.filter(channel => channel instanceof VoiceChannel);

    embed.fields.push({
      name: "Channels",
      inline: true,
      value:
        trimLines(`
        Total: **${totalChannels}** / 500
        Categories: **${categories.length}**
        Text: **${textChannels.length}**
        Voice: **${voiceChannels.length}**
      `) + embedPadding,
    });

    const maxEmojis =
      {
        0: 50,
        1: 100,
        2: 150,
        3: 250,
      }[this.guild.premiumTier] || 50;

    embed.fields.push({
      name: "Other stats",
      inline: true,
      value:
        trimLines(`
        Roles: **${this.guild.roles.size}** / 250
        Emojis: **${this.guild.emojis.length}** / ${maxEmojis}
        Boosts: **${this.guild.premiumSubscriptionCount}** (level ${this.guild.premiumTier})
      `) + embedPadding,
    });

    msg.channel.createMessage({ embed });
  }

  @d.command("ping", "", {
    extra: {
      info: <CommandInfo>{
        description: "Test the bot's ping to the Discord API",
      },
    },
  })
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
    const mean = Math.round(times.reduce((total, ms) => total + ms, 0) / times.length);

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
    this.bot
      .deleteMessages(
        messages[0].channel.id,
        messages.map(m => m.id),
      )
      .catch(noop);
  }

  @d.command("source", "<messageId:string>", {
    extra: {
      info: <CommandInfo>{
        description: "View the message source of the specified message id",
        basicUsage: "!source 534722219696455701",
      },
    },
  })
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

  @d.command("context", "<channel:channel> <messageId:string>", {
    extra: {
      info: <CommandInfo>{
        description: "Get a link to the context of the specified message",
        basicUsage: "!context 94882524378968064 650391267720822785",
      },
    },
  })
  @d.permission("can_context")
  async contextCmd(msg: Message, args: { channel: Channel; messageId: string }) {
    if (!(args.channel instanceof TextChannel)) {
      this.sendErrorMessage(msg.channel, "Channel must be a text channel");
      return;
    }

    const previousMessage = (await this.bot.getMessages(args.channel.id, 1, args.messageId))[0];
    if (!previousMessage) {
      this.sendErrorMessage(msg.channel, "Message context not found");
      return;
    }

    msg.channel.createMessage(messageLink(this.guildId, previousMessage.channel.id, previousMessage.id));
  }

  @d.command("vcmove", "<member:resolvedMember> <channel:string$>", {
    extra: {
      info: <CommandInfo>{
        description: "Move a member to another voice channel",
        basicUsage: "!vcmove @Dragory 473223047822704651",
      },
    },
  })
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

    this.sendSuccessMessage(
      msg.channel,
      `**${args.member.user.username}#${args.member.user.discriminator}** moved to **${channel.name}**`,
    );
  }

  @d.command("help", "<command:string$>", {
    extra: {
      info: <CommandInfo>{
        description: "Show a quick reference for the specified command's usage",
        basicUsage: "!help clean",
      },
    },
  })
  @d.permission("can_help")
  helpCmd(msg: Message, args: { command: string }) {
    const searchStr = args.command.toLowerCase();

    const matchingCommands: Array<{
      plugin: ZeppelinPlugin;
      command: ICommandDefinition<ICommandContext, ICommandExtraData>;
    }> = [];

    const guildData = this.knub.getGuildData(this.guildId);
    for (const plugin of guildData.loadedPlugins.values()) {
      if (!(plugin instanceof ZeppelinPlugin)) continue;

      const registeredCommands = plugin.getRegisteredCommands();
      for (const registeredCommand of registeredCommands) {
        for (const trigger of registeredCommand.command.originalTriggers) {
          const strTrigger = typeof trigger === "string" ? trigger : trigger.source;

          if (strTrigger.startsWith(searchStr)) {
            matchingCommands.push({
              plugin,
              command: registeredCommand.command,
            });
          }
        }
      }
    }

    const totalResults = matchingCommands.length;
    const limitedResults = matchingCommands.slice(0, 3);
    const commandSnippets = limitedResults.map(({ plugin, command }) => {
      const prefix: string = command.originalPrefix
        ? typeof command.originalPrefix === "string"
          ? command.originalPrefix
          : command.originalPrefix.source
        : "";

      const originalTrigger = command.originalTriggers[0];
      const trigger: string = originalTrigger
        ? typeof originalTrigger === "string"
          ? originalTrigger
          : originalTrigger.source
        : "";

      const description = get(command, "config.extra.info.description");
      const basicUsage = get(command, "config.extra.info.basicUsage");
      const commandSlug = trigger
        .trim()
        .toLowerCase()
        .replace(/\s/g, "-");

      let snippet = `**${prefix}${trigger}**`;
      if (description) snippet += `\n${description}`;
      if (basicUsage) snippet += `\nBasic usage: \`${basicUsage}\``;
      snippet += `\n<https://zeppelin.gg/docs/plugins/${plugin.runtimePluginName}/usage#command-${commandSlug}>`;

      return snippet;
    });

    if (totalResults === 0) {
      msg.channel.createMessage("No matching commands found!");
      return;
    }

    let message =
      totalResults !== limitedResults.length
        ? `Results (${totalResults} total, showing first ${limitedResults.length}):\n\n`
        : "";

    message += `${commandSnippets.join("\n\n")}`;
    createChunkedMessage(msg.channel, message);
  }

  @d.command("about", "", {
    extra: {
      info: <CommandInfo>{
        description: "Show information about Zeppelin's status on the server",
      },
    },
  })
  @d.permission("can_about")
  async aboutCmd(msg: Message) {
    const uptime = getCurrentUptime();
    const prettyUptime = humanizeDuration(uptime, { largest: 2, round: true });

    let lastCommit;

    try {
      // From project root
      // FIXME: Store these paths properly somewhere
      const lcl = new LCL(path.resolve(__dirname, "..", "..", ".."));
      lastCommit = await lcl.getLastCommit();
    } catch (e) {} // tslint:disable-line:no-empty

    let lastUpdate;
    let version;

    if (lastCommit) {
      lastUpdate = moment(lastCommit.committer.date, "X").format("LL [at] H:mm [(UTC)]");
      version = lastCommit.shortHash;
    } else {
      lastUpdate = "?";
      version = "?";
    }

    const shard = this.bot.shards.get(this.bot.guildShardMap[this.guildId]);

    const lastReload = humanizeDuration(Date.now() - this.lastReload, {
      largest: 2,
      round: true,
    });

    const basicInfoRows = [
      ["Uptime", prettyUptime],
      ["Last reload", `${lastReload} ago`],
      ["Last update", lastUpdate],
      ["Version", version],
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

  @d.command("reload_guild", "", {
    extra: {
      info: <CommandInfo>{
        description: "Reload the Zeppelin configuration and all plugins for the server. This can sometimes fix issues.",
      },
    },
  })
  @d.permission("can_reload_guild")
  reloadGuildCmd(msg: Message) {
    if (activeReloads.has(this.guildId)) return;
    activeReloads.set(this.guildId, msg.channel as TextChannel);

    msg.channel.createMessage("Reloading...");
    this.knub.reloadGuild(this.guildId);
  }

  @d.command("jumbo", "<emoji:string>", {
    extra: {
      info: <CommandInfo>{
        description: "Makes an emoji jumbo",
      },
    },
  })
  @d.permission("can_jumbo")
  @d.cooldown(5 * SECONDS)
  async jumboCmd(msg: Message, args: { emoji: string }) {
    // Get emoji url
    const config = this.getConfig();
    const emojiRegex = new RegExp(`(<.*:).*:(\\d+)`);
    const results = emojiRegex.exec(args.emoji);
    let extention = ".png";
    let file;

    if (results) {
      let url = "https://cdn.discordapp.com/emojis/";
      if (results[1] === "<a:") {
        extention = ".gif";
      }
      url += `${results[2]}${extention}`;
      if (extention === ".png") {
        const image = await this.resizeBuffer(await this.getBufferFromUrl(url), config.jumbo_size, config.jumbo_size);
        file = {
          name: `emoji${extention}`,
          file: image,
        };
      } else {
        const image = await this.getBufferFromUrl(url);
        file = {
          name: `emoji${extention}`,
          file: image,
        };
      }
    } else {
      let url = CDN_URL + `/${twemoji.convert.toCodePoint(args.emoji)}.svg`;
      let image;
      try {
        image = await this.resizeBuffer(await this.getBufferFromUrl(url), config.jumbo_size, config.jumbo_size);
      } catch {
        if (url.toLocaleLowerCase().endsWith("fe0f.svg")) {
          url = url.slice(0, url.lastIndexOf("-fe0f")) + ".svg";
          image = await this.resizeBuffer(await this.getBufferFromUrl(url), config.jumbo_size, config.jumbo_size);
        }
      }
      file = {
        name: `emoji.png`,
        file: image,
      };
    }
    msg.channel.createMessage("", file);
    return;
  }

  @d.command("avatar", "[user:resolvedUserLoose]", {
    extra: {
      info: <CommandInfo>{
        description: "Retrieves a users profile picture",
      },
    },
  })
  @d.permission("can_avatar")
  async avatarCmd(msg: Message, args: { user?: User | UnknownUser }) {
    const user = args.user || msg.author;
    if (!(user instanceof UnknownUser)) {
      const extention = user.avatarURL.slice(user.avatarURL.lastIndexOf("."), user.avatarURL.lastIndexOf("?"));
      const avatarUrl = user.avatarURL.slice(0, user.avatarURL.lastIndexOf("."));
      const embed: EmbedOptions = {
        image: { url: avatarUrl + `${extention}?size=2048` },
      };
      embed.title = `Avatar of ${user.username}#${user.discriminator}:`;
      msg.channel.createMessage({ embed });
    } else {
      this.sendErrorMessage(msg.channel, "Invalid user ID");
    }
  }

  async resizeBuffer(input: Buffer, width: number, height: number): Promise<Buffer> {
    return sharp(input, { density: 800 })
      .resize(width, height, {
        fit: "inside",
      })
      .toBuffer();
  }

  async getBufferFromUrl(url: string): Promise<Buffer> {
    const downloadedEmoji = await downloadFile(url);
    return fsp.readFile(downloadedEmoji.path);
  }
}
