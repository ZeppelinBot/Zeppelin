import { modActionsCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import {
  UnknownUser,
  multiSorter,
  trimLines,
  createChunkedMessage,
  resolveUser,
  emptyEmbedValue,
  chunkArray,
} from "../../../utils";
import { getGuildPrefix } from "../../../utils/getGuildPrefix";
import { EmbedOptions, User } from "eris";
import { getChunkedEmbedFields } from "../../../utils/getChunkedEmbedFields";
import { asyncMap } from "../../../utils/async";
import { CaseTypes } from "../../../data/CaseTypes";

const opts = {
  expand: ct.bool({ option: true, isSwitch: true, shortcut: "e" }),
  hidden: ct.bool({ option: true, isSwitch: true, shortcut: "h" }),
  reverseFilters: ct.switchOption({ shortcut: "r" }),
  notes: ct.switchOption({ shortcut: "n" }),
  warns: ct.switchOption({ shortcut: "w" }),
  mutes: ct.switchOption({ shortcut: "m" }),
  unmutes: ct.switchOption({ shortcut: "um" }),
  bans: ct.switchOption({ shortcut: "b" }),
  unbans: ct.switchOption({ shortcut: "ub" }),
};

export const CasesUserCmd = modActionsCmd({
  trigger: ["cases", "modlogs"],
  permission: "can_view",
  description: "Show a list of cases the specified user has",

  signature: [
    {
      user: ct.string(),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

    let cases = await pluginData.state.cases.with("notes").getByUserId(user.id);

    const typesToShow: CaseTypes[] = [];
    if (args.notes) typesToShow.push(CaseTypes.Note);
    if (args.warns) typesToShow.push(CaseTypes.Warn);
    if (args.mutes) typesToShow.push(CaseTypes.Mute);
    if (args.unmutes) typesToShow.push(CaseTypes.Unmute);
    if (args.bans) typesToShow.push(CaseTypes.Ban);
    if (args.unbans) typesToShow.push(CaseTypes.Unban);

    if (typesToShow.length > 0) {
      // Reversed: Hide specified types
      if (args.reverseFilters) cases = cases.filter(c => !typesToShow.includes(c.type));
      // Normal: Show only specified types
      else cases = cases.filter(c => typesToShow.includes(c.type));
    }

    const normalCases = cases.filter(c => !c.is_hidden);
    const hiddenCases = cases.filter(c => c.is_hidden);

    const userName =
      user instanceof UnknownUser && cases.length
        ? cases[cases.length - 1].user_name
        : `${user.username}#${user.discriminator}`;

    if (cases.length === 0) {
      msg.channel.createMessage(`No cases found for **${userName}**`);
    } else {
      const casesToDisplay = args.hidden ? cases : normalCases;

      if (args.expand) {
        if (casesToDisplay.length > 8) {
          msg.channel.createMessage("Too many cases for expanded view. Please use compact view instead.");
          return;
        }

        // Expanded view (= individual case embeds)
        const casesPlugin = pluginData.getPlugin(CasesPlugin);
        for (const theCase of casesToDisplay) {
          const embed = await casesPlugin.getCaseEmbed(theCase.id);
          msg.channel.createMessage(embed);
        }
      } else {
        // Compact view (= regular message with a preview of each case)
        const casesPlugin = pluginData.getPlugin(CasesPlugin);
        const lines = await asyncMap(casesToDisplay, c => casesPlugin.getCaseSummary(c, true, msg.author.id));

        const prefix = getGuildPrefix(pluginData);
        const linesPerChunk = 10;
        const lineChunks = chunkArray(lines, linesPerChunk);

        const footerField = {
          name: emptyEmbedValue,
          value: trimLines(`
            Use \`${prefix}case <num>\` to see more information about an individual case
          `),
        };

        for (const [i, linesInChunk] of lineChunks.entries()) {
          const isLastChunk = i === lineChunks.length - 1;

          if (isLastChunk && !args.hidden && hiddenCases.length) {
            if (hiddenCases.length === 1) {
              linesInChunk.push(`*+${hiddenCases.length} hidden case, use "-hidden" to show it*`);
            } else {
              linesInChunk.push(`*+${hiddenCases.length} hidden cases, use "-hidden" to show them*`);
            }
          }

          const chunkStart = i * linesPerChunk + 1;
          const chunkEnd = Math.min((i + 1) * linesPerChunk, lines.length);

          const embed: EmbedOptions = {
            author: {
              name:
                lineChunks.length === 1
                  ? `Cases for ${userName} (${lines.length} total)`
                  : `Cases ${chunkStart}–${chunkEnd} of ${lines.length} for ${userName}`,
              icon_url: user instanceof User ? user.avatarURL || user.defaultAvatarURL : undefined,
            },
            fields: [
              ...getChunkedEmbedFields(emptyEmbedValue, linesInChunk.join("\n")),
              ...(isLastChunk ? [footerField] : []),
            ],
          };

          msg.channel.createMessage({ embed });
        }
      }
    }
  },
});
