import {
  GuildMember,
  Message,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
  Permissions,
  Snowflake,
  TextChannel,
  User,
} from "discord.js";
import escapeStringRegexp from "escape-string-regexp";
import { GuildPluginData } from "knub";
import { ArgsFromSignatureOrArray } from "knub/dist/commands/commandUtils";
import moment from "moment-timezone";
import { getBaseUrl, sendErrorMessage } from "../../pluginUtils";
import { allowTimeout, RegExpRunner } from "../../RegExpRunner";
import { MINUTES, multiSorter, sorter, trimLines } from "../../utils";
import { asyncFilter } from "../../utils/async";
import { hasDiscordPermissions } from "../../utils/hasDiscordPermissions";
import { inputPatternToRegExp, InvalidRegexError } from "../../validatorUtils";
import { banSearchSignature } from "./commands/BanSearchCmd";
import { searchCmdSignature } from "./commands/SearchCmd";
import { getUserInfoEmbed } from "./functions/getUserInfoEmbed";
import { refreshMembersIfNeeded } from "./refreshMembers";
import { UtilityPluginType } from "./types";
import Timeout = NodeJS.Timeout;

const SEARCH_RESULTS_PER_PAGE = 15;
const SEARCH_ID_RESULTS_PER_PAGE = 50;
const SEARCH_EXPORT_LIMIT = 1_000_000;

export enum SearchType {
  MemberSearch,
  BanSearch,
}

class SearchError extends Error {}

type MemberSearchParams = ArgsFromSignatureOrArray<typeof searchCmdSignature>;
type BanSearchParams = ArgsFromSignatureOrArray<typeof banSearchSignature>;

type RegexRunner = InstanceType<typeof RegExpRunner>["exec"];
function getOptimizedRegExpRunner(pluginData: GuildPluginData<UtilityPluginType>, isSafeRegex: boolean): RegexRunner {
  if (isSafeRegex) {
    return async (regex: RegExp, str: string) => {
      if (!regex.global) {
        const singleMatch = regex.exec(str);
        return singleMatch ? [singleMatch] : null;
      }

      const matches: RegExpExecArray[] = [];
      let match: RegExpExecArray | null;
      // tslint:disable-next-line:no-conditional-assignment
      while ((match = regex.exec(str)) != null) {
        matches.push(match);
      }

      return matches.length ? matches : null;
    };
  }

  return pluginData.state.regexRunner.exec.bind(pluginData.state.regexRunner);
}

export async function displaySearch(
  pluginData: GuildPluginData<UtilityPluginType>,
  args: MemberSearchParams,
  searchType: SearchType.MemberSearch,
  msg: Message,
);
export async function displaySearch(
  pluginData: GuildPluginData<UtilityPluginType>,
  args: BanSearchParams,
  searchType: SearchType.BanSearch,
  msg: Message,
);
export async function displaySearch(
  pluginData: GuildPluginData<UtilityPluginType>,
  args: MemberSearchParams | BanSearchParams,
  searchType: SearchType,
  msg: Message,
) {
  // If we're not exporting, load 1 page of search results at a time and allow the user to switch pages with reactions
  let originalSearchMsg: Message;
  let searching = false;
  let currentPage = args.page || 1;
  let stopCollectionFn: () => void;
  let stopCollectionTimeout: Timeout;

  const perPage = args.ids ? SEARCH_ID_RESULTS_PER_PAGE : SEARCH_RESULTS_PER_PAGE;

  const loadSearchPage = async (page) => {
    if (searching) return;
    searching = true;

    // The initial message is created here, as well as edited to say "Searching..." on subsequent requests
    // We don't "await" this so we can start loading the search results immediately instead of after the message has been created/edited
    let searchMsgPromise: Promise<Message>;
    if (originalSearchMsg) {
      searchMsgPromise = originalSearchMsg.edit("Searching...");
    } else {
      searchMsgPromise = msg.channel.send("Searching...");
      searchMsgPromise.then((m) => (originalSearchMsg = m));
    }

    let searchResult;
    try {
      switch (searchType) {
        case SearchType.MemberSearch:
          searchResult = await performMemberSearch(pluginData, args as MemberSearchParams, page, perPage);
          break;
        case SearchType.BanSearch:
          searchResult = await performBanSearch(pluginData, args as BanSearchParams, page, perPage);
          break;
      }
    } catch (e) {
      if (e instanceof SearchError) {
        sendErrorMessage(pluginData, msg.channel as TextChannel, e.message);
        return;
      }

      if (e instanceof InvalidRegexError) {
        sendErrorMessage(pluginData, msg.channel as TextChannel, e.message);
        return;
      }

      throw e;
    }

    if (searchResult.totalResults === 0) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "No results found");
      return;
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

    const cfg = await pluginData.config.getForUser(msg.author);
    if (cfg.info_on_single_result && searchResult.totalResults === 1) {
      const embed = await getUserInfoEmbed(pluginData, searchResult.results[0].id, false);
      if (embed) {
        searchMsg.edit("Only one result:");
        msg.channel.send({ embeds: [embed] });
        return;
      }
    }

    currentPage = searchResult.page;

    // Set up pagination reactions if needed. The reactions are cleared after a timeout.
    if (searchResult.totalResults > perPage) {
      const idMod = `${searchMsg.id}:${moment.utc().valueOf()}`;
      const buttons: MessageButton[] = [];

      buttons.push(
        new MessageButton()
          .setStyle("SECONDARY")
          .setEmoji("⬅")
          .setCustomId(`previousButton:${idMod}`)
          .setDisabled(currentPage === 1),
        new MessageButton()
          .setStyle("SECONDARY")
          .setEmoji("➡")
          .setCustomId(`nextButton:${idMod}`)
          .setDisabled(currentPage === searchResult.lastPage),
        new MessageButton().setStyle("SECONDARY").setEmoji("🔄").setCustomId(`reloadButton:${idMod}`),
      );

      const row = new MessageActionRow().addComponents(buttons);
      await searchMsg.edit({ content: result, components: [row] });

      const collector = searchMsg.createMessageComponentCollector({ time: 2 * MINUTES });

      collector.on("collect", async (interaction: MessageComponentInteraction) => {
        if (msg.author.id !== interaction.user.id) {
          interaction
            .reply({ content: `You are not permitted to use these buttons.`, ephemeral: true })
            .catch((err) => console.trace(err.message));
        } else {
          if (interaction.customId === `previousButton:${idMod}` && currentPage > 1) {
            collector.stop();
            await interaction.deferUpdate();
            await loadSearchPage(currentPage - 1);
          } else if (interaction.customId === `nextButton:${idMod}` && currentPage < searchResult.lastPage) {
            collector.stop();
            await interaction.deferUpdate();
            await loadSearchPage(currentPage + 1);
          } else if (interaction.customId === `reloadButton:${idMod}`) {
            collector.stop();
            await interaction.deferUpdate();
            await loadSearchPage(currentPage);
          } else {
            await interaction.deferUpdate();
          }
        }
      });

      stopCollectionFn = async () => {
        collector.stop();
        await searchMsg.edit({ content: searchMsg.content, components: [] });
      };

      clearTimeout(stopCollectionTimeout);
      stopCollectionTimeout = setTimeout(stopCollectionFn, 2 * MINUTES);
    } else {
      searchMsg.edit(result);
    }

    searching = false;
  };

  loadSearchPage(currentPage);
}

export async function archiveSearch(
  pluginData: GuildPluginData<UtilityPluginType>,
  args: MemberSearchParams,
  searchType: SearchType.MemberSearch,
  msg: Message,
);
export async function archiveSearch(
  pluginData: GuildPluginData<UtilityPluginType>,
  args: BanSearchParams,
  searchType: SearchType.BanSearch,
  msg: Message,
);
export async function archiveSearch(
  pluginData: GuildPluginData<UtilityPluginType>,
  args: MemberSearchParams | BanSearchParams,
  searchType: SearchType,
  msg: Message,
) {
  let results;
  try {
    switch (searchType) {
      case SearchType.MemberSearch:
        results = await performMemberSearch(pluginData, args as MemberSearchParams, 1, SEARCH_EXPORT_LIMIT);
        break;
      case SearchType.BanSearch:
        results = await performBanSearch(pluginData, args as BanSearchParams, 1, SEARCH_EXPORT_LIMIT);
        break;
    }
  } catch (e) {
    if (e instanceof SearchError) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, e.message);
      return;
    }

    if (e instanceof InvalidRegexError) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, e.message);
      return;
    }

    throw e;
  }

  if (results.totalResults === 0) {
    sendErrorMessage(pluginData, msg.channel as TextChannel, "No results found");
    return;
  }

  const resultList = args.ids ? formatSearchResultIdList(results.results) : formatSearchResultList(results.results);

  const archiveId = await pluginData.state.archives.create(
    trimLines(`
      Search results (total ${results.totalResults}):

      ${resultList}
    `),
    moment.utc().add(1, "hour"),
  );

  const baseUrl = getBaseUrl(pluginData);
  const url = await pluginData.state.archives.getUrl(baseUrl, archiveId);

  await msg.channel.send(`Exported search results: ${url}`);
}

async function performMemberSearch(
  pluginData: GuildPluginData<UtilityPluginType>,
  args: MemberSearchParams,
  page = 1,
  perPage = SEARCH_RESULTS_PER_PAGE,
): Promise<{ results: GuildMember[]; totalResults: number; page: number; lastPage: number; from: number; to: number }> {
  await refreshMembersIfNeeded(pluginData.guild);

  let matchingMembers = Array.from(pluginData.guild.members.cache.values());

  if (args.role) {
    const roleIds = args.role.split(",");
    matchingMembers = matchingMembers.filter((member) => {
      for (const role of roleIds) {
        if (!member.roles.cache.has(role as Snowflake)) return false;
      }

      return true;
    });
  }

  if (args.voice) {
    matchingMembers = matchingMembers.filter((m) => m.voice.channelId);
  }

  if (args.bot) {
    matchingMembers = matchingMembers.filter((m) => m.user.bot);
  }

  if (args.query) {
    let isSafeRegex = true;
    let queryRegex: RegExp;
    if (args.regex) {
      const flags = args["case-sensitive"] ? "" : "i";
      queryRegex = inputPatternToRegExp(args.query.trimStart());
      queryRegex = new RegExp(queryRegex.source, flags);
      isSafeRegex = false;
    } else {
      queryRegex = new RegExp(escapeStringRegexp(args.query.trimStart()), args["case-sensitive"] ? "" : "i");
    }

    const execRegExp = getOptimizedRegExpRunner(pluginData, isSafeRegex);

    /* FIXME if we ever get the intent for this again
    if (args["status-search"]) {
      matchingMembers = await asyncFilter(matchingMembers, async member => {
        if (member.game) {
          if (member.game.name && (await execRegExp(queryRegex, member.game.name).catch(allowTimeout))) {
            return true;
          }

          if (member.game.state && (await execRegExp(queryRegex, member.game.state).catch(allowTimeout))) {
            return true;
          }

          if (member.game.details && (await execRegExp(queryRegex, member.game.details).catch(allowTimeout))) {
            return true;
          }

          if (member.game.assets) {
            if (
              member.game.assets.small_text &&
              (await execRegExp(queryRegex, member.game.assets.small_text).catch(allowTimeout))
            ) {
              return true;
            }

            if (
              member.game.assets.large_text &&
              (await execRegExp(queryRegex, member.game.assets.large_text).catch(allowTimeout))
            ) {
              return true;
            }
          }

          if (member.game.emoji && (await execRegExp(queryRegex, member.game.emoji.name).catch(allowTimeout))) {
            return true;
          }
        }
        return false;
      });
    } else {
    */
    matchingMembers = await asyncFilter(matchingMembers, async (member) => {
      if (member.nickname && (await execRegExp(queryRegex, member.nickname).catch(allowTimeout))) {
        return true;
      }

      const fullUsername = member.user.tag;
      if (await execRegExp(queryRegex, fullUsername).catch(allowTimeout)) return true;

      return false;
    });
    // } FIXME in conjunction with above comment
  }

  const [, sortDir, sortBy] = (args.sort && args.sort.match(/^(-?)(.*)$/)) ?? [null, "ASC", "name"];
  const realSortDir = sortDir === "-" ? "DESC" : "ASC";

  if (sortBy === "id") {
    matchingMembers.sort(sorter((m) => BigInt(m.id), realSortDir));
  } else {
    matchingMembers.sort(
      multiSorter([
        [(m) => m.user.username.toLowerCase(), realSortDir],
        [(m) => m.discriminator, realSortDir],
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

async function performBanSearch(
  pluginData: GuildPluginData<UtilityPluginType>,
  args: BanSearchParams,
  page = 1,
  perPage = SEARCH_RESULTS_PER_PAGE,
): Promise<{ results: User[]; totalResults: number; page: number; lastPage: number; from: number; to: number }> {
  const member = pluginData.guild.members.cache.get(pluginData.client.user!.id);
  if (member && !hasDiscordPermissions(member.permissions, Permissions.FLAGS.BAN_MEMBERS)) {
    throw new SearchError(`Unable to search bans: missing "Ban Members" permission`);
  }

  let matchingBans = (await pluginData.guild.bans.fetch({ cache: false })).map((x) => x.user);

  if (args.query) {
    let isSafeRegex = true;
    let queryRegex: RegExp;
    if (args.regex) {
      const flags = args["case-sensitive"] ? "" : "i";
      queryRegex = inputPatternToRegExp(args.query.trimStart());
      queryRegex = new RegExp(queryRegex.source, flags);
      isSafeRegex = false;
    } else {
      queryRegex = new RegExp(escapeStringRegexp(args.query.trimStart()), args["case-sensitive"] ? "" : "i");
    }

    const execRegExp = getOptimizedRegExpRunner(pluginData, isSafeRegex);
    matchingBans = await asyncFilter(matchingBans, async (user) => {
      const fullUsername = user.tag;
      if (await execRegExp(queryRegex, fullUsername).catch(allowTimeout)) return true;
      return false;
    });
  }

  const [, sortDir, sortBy] = (args.sort && args.sort.match(/^(-?)(.*)$/)) ?? [null, "ASC", "name"];
  const realSortDir = sortDir === "-" ? "DESC" : "ASC";

  if (sortBy === "id") {
    matchingBans.sort(sorter((m) => BigInt(m.id), realSortDir));
  } else {
    matchingBans.sort(
      multiSorter([
        [(m) => m.username.toLowerCase(), realSortDir],
        [(m) => m.discriminator, realSortDir],
      ]),
    );
  }

  const lastPage = Math.max(1, Math.ceil(matchingBans.length / perPage));
  page = Math.min(lastPage, Math.max(1, page));

  const from = (page - 1) * perPage;
  const to = Math.min(from + perPage, matchingBans.length);

  const pageMembers = matchingBans.slice(from, to);

  return {
    results: pageMembers,
    totalResults: matchingBans.length,
    page,
    lastPage,
    from: from + 1,
    to,
  };
}

function formatSearchResultList(members: Array<GuildMember | User>): string {
  const longestId = members.reduce((longest, member) => Math.max(longest, member.id.length), 0);
  const lines = members.map((member) => {
    const paddedId = member.id.padEnd(longestId, " ");
    let line;
    if (member instanceof GuildMember) {
      line = `${paddedId} ${member.user.tag}`;
      if (member.nickname) line += ` (${member.nickname})`;
    } else {
      line = `${paddedId} ${member.tag}`;
    }
    return line;
  });
  return lines.join("\n");
}

function formatSearchResultIdList(members: Array<GuildMember | User>): string {
  return members.map((m) => m.id).join(" ");
}
