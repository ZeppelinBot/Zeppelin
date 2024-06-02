import { APIEmbed, User } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { CaseTypes } from "../../../data/CaseTypes.js";
import { sendErrorMessage } from "../../../pluginUtils.js";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin.js";
import {
  UnknownUser,
  chunkArray,
  emptyEmbedValue,
  renderUsername,
  resolveMember,
  resolveUser,
} from "../../../utils.js";
import { asyncMap } from "../../../utils/async.js";
import { createPaginatedMessage } from "../../../utils/createPaginatedMessage.js";
import { getGuildPrefix } from "../../../utils/getGuildPrefix.js";
import { modActionsCmd } from "../types.js";

const opts = {
  expand: ct.bool({ option: true, isSwitch: true, shortcut: "e" }),
  hidden: ct.bool({ option: true, isSwitch: true, shortcut: "h" }),
  reverseFilters: ct.switchOption({ def: false, shortcut: "r" }),
  notes: ct.switchOption({ def: false, shortcut: "n" }),
  warns: ct.switchOption({ def: false, shortcut: "w" }),
  mutes: ct.switchOption({ def: false, shortcut: "m" }),
  unmutes: ct.switchOption({ def: false, shortcut: "um" }),
  bans: ct.switchOption({ def: false, shortcut: "b" }),
  unbans: ct.switchOption({ def: false, shortcut: "ub" }),
};

const casesPerPage = 5;

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
    const user =
      (await resolveMember(pluginData.client, pluginData.guild, args.user)) ||
      (await resolveUser(pluginData.client, args.user));
    if (user instanceof UnknownUser) {
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
      if (args.reverseFilters) cases = cases.filter((c) => !typesToShow.includes(c.type));
      // Normal: Show only specified types
      else cases = cases.filter((c) => typesToShow.includes(c.type));
    }

    const normalCases = cases.filter((c) => !c.is_hidden);
    const hiddenCases = cases.filter((c) => c.is_hidden);

    const userName =
      user instanceof UnknownUser && cases.length ? cases[cases.length - 1].user_name : renderUsername(user);

    if (cases.length === 0) {
      msg.channel.send(`No cases found for **${userName}**`);
    } else {
      const casesToDisplay = args.hidden ? cases : normalCases;
      if (!casesToDisplay.length) {
        msg.channel.send(
          `No normal cases found for **${userName}**. Use "-hidden" to show ${cases.length} hidden cases.`,
        );
        return;
      }

      if (args.expand) {
        if (casesToDisplay.length > 8) {
          msg.channel.send("Too many cases for expanded view. Please use compact view instead.");
          return;
        }

        // Expanded view (= individual case embeds)
        const casesPlugin = pluginData.getPlugin(CasesPlugin);
        for (const theCase of casesToDisplay) {
          const embed = await casesPlugin.getCaseEmbed(theCase.id);
          msg.channel.send(embed);
        }
      } else {
        // Compact view (= regular message with a preview of each case)
        const casesPlugin = pluginData.getPlugin(CasesPlugin);

        const totalPages = Math.max(Math.ceil(casesToDisplay.length / casesPerPage), 1);
        const prefix = getGuildPrefix(pluginData);

        createPaginatedMessage(
          pluginData.client,
          msg.channel,
          totalPages,
          async (page) => {
            const chunkedCases = chunkArray(casesToDisplay, casesPerPage)[page - 1];
            const lines = await asyncMap(chunkedCases, (c) => casesPlugin.getCaseSummary(c, true, msg.author.id));

            const isLastPage = page === totalPages;
            const firstCaseNum = (page - 1) * casesPerPage + 1;
            const lastCaseNum = isLastPage ? casesToDisplay.length : page * casesPerPage;
            const title =
              totalPages === 1
                ? `Cases for ${userName} (${lines.length} total)`
                : `Most recent cases ${firstCaseNum}-${lastCaseNum} of ${casesToDisplay.length} for ${userName}`;

            const embed = {
              author: {
                name: title,
                icon_url: user instanceof User ? user.displayAvatarURL() : undefined,
              },
              description: lines.join("\n"),
              fields: [
                {
                  name: emptyEmbedValue,
                  value: `Use \`${prefix}case <num>\` to see more information about an individual case`,
                },
              ],
            } satisfies APIEmbed;

            if (isLastPage && !args.hidden && hiddenCases.length)
              embed.fields.push({
                name: emptyEmbedValue,
                value:
                  hiddenCases.length === 1
                    ? `*+${hiddenCases.length} hidden case, use "-hidden" to show it*`
                    : `*+${hiddenCases.length} hidden cases, use "-hidden" to show them*`,
              });

            return { embeds: [embed] };
          },
          {
            limitToUserId: msg.author.id,
          },
        );
      }
    }
  },
});
