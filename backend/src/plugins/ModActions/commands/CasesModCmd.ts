import { modActionsCommand } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { trimLines, createChunkedMessage } from "src/utils";

const opts = {
  mod: ct.member({ option: true }),
};

export const CasesModCmd = modActionsCommand({
  trigger: "cases",
  permission: "can_view",
  description: "Show the most recent 5 cases by the specified -mod",

  signature: [
    {
      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const modId = args.mod ? args.mod.id : msg.author.id;
    const recentCases = await pluginData.state.cases.with("notes").getRecentByModId(modId, 5);

    const mod = pluginData.client.users.get(modId);
    const modName = mod ? `${mod.username}#${mod.discriminator}` : modId;

    if (recentCases.length === 0) {
      sendErrorMessage(pluginData, msg.channel, `No cases by **${modName}**`);
    } else {
      const lines = recentCases.map(c => pluginData.state.cases.getSummaryText(c));
      const finalMessage = trimLines(`
        Most recent 5 cases by **${modName}**:

        ${lines.join("\n")}

        Use the \`case <num>\` command to see more info about individual cases
        Use the \`cases <user>\` command to see a specific user's cases
      `);
      createChunkedMessage(msg.channel, finalMessage);
    }
  },
});
