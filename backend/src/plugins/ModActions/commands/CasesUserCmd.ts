import { modActionsCommand } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { CasesPlugin } from "src/plugins/Cases/CasesPlugin";
import { UnknownUser, multiSorter, trimLines, createChunkedMessage, resolveUser } from "src/utils";

const opts = {
  expand: ct.bool({ option: true, isSwitch: true, shortcut: "e" }),
  hidden: ct.bool({ option: true, isSwitch: true, shortcut: "h" }),
};

export const CasesUserCmd = modActionsCommand({
  trigger: "cases",
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
    if (!user) return sendErrorMessage(pluginData, msg.channel, `User not found`);

    const cases = await pluginData.state.cases.with("notes").getByUserId(user.id);
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
        const lines = [];
        for (const theCase of casesToDisplay) {
          theCase.notes.sort(multiSorter(["created_at", "id"]));
          const caseSummary = pluginData.state.cases.getSummaryText(theCase);
          lines.push(caseSummary);
        }

        if (!args.hidden && hiddenCases.length) {
          if (hiddenCases.length === 1) {
            lines.push(`*+${hiddenCases.length} hidden case, use "-hidden" to show it*`);
          } else {
            lines.push(`*+${hiddenCases.length} hidden cases, use "-hidden" to show them*`);
          }
        }

        const finalMessage = trimLines(`
        Cases for **${userName}**:

        ${lines.join("\n")}

        Use the \`case <num>\` command to see more info about individual cases
      `);

        createChunkedMessage(msg.channel, finalMessage);
      }
    }
  },
});
