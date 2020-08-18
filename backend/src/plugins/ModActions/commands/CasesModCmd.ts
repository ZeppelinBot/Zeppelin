import { modActionsCommand } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { trimLines, createChunkedMessage, emptyEmbedValue, sorter } from "src/utils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { asyncMap } from "../../../utils/async";
import { EmbedOptions } from "eris";
import { getChunkedEmbedFields } from "../../../utils/getChunkedEmbedFields";
import { getDefaultPrefix } from "knub/dist/commands/commandUtils";
import { getGuildPrefix } from "../../../utils/getGuildPrefix";

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
    recentCases.sort(sorter("case_number", "ASC"));

    const mod = pluginData.client.users.get(modId);
    const modName = mod ? `${mod.username}#${mod.discriminator}` : modId;

    if (recentCases.length === 0) {
      sendErrorMessage(pluginData, msg.channel, `No cases by **${modName}**`);
    } else {
      const casesPlugin = pluginData.getPlugin(CasesPlugin);
      const lines = await asyncMap(recentCases, c => casesPlugin.getCaseSummary(c, true, msg.author.id));
      const prefix = getGuildPrefix(pluginData);
      const embed: EmbedOptions = {
        author: {
          name: `Most recent 5 cases by ${modName}`,
          icon_url: mod ? mod.avatarURL || mod.defaultAvatarURL : undefined,
        },
        fields: [
          ...getChunkedEmbedFields(emptyEmbedValue, lines.join("\n")),
          {
            name: emptyEmbedValue,
            value: trimLines(`
              Use \`${prefix}case <num>\` to see more information about an individual case
              Use \`${prefix}cases <user>\` to see a specific user's cases
            `),
          },
        ],
      };
      msg.channel.createMessage({ embed });
    }
  },
});
