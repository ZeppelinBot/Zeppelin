import { MessageEmbedOptions, User } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { emptyEmbedValue, resolveUser, trimLines } from "../../../utils";
import { asyncMap } from "../../../utils/async";
import { createPaginatedMessage } from "../../../utils/createPaginatedMessage";
import { getChunkedEmbedFields } from "../../../utils/getChunkedEmbedFields";
import { getGuildPrefix } from "../../../utils/getGuildPrefix";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { modActionsCmd } from "../types";

const opts = {
  mod: ct.userId({ option: true }),
};

const casesPerPage = 5;

export const CasesModCmd = modActionsCmd({
  trigger: ["cases", "modlogs", "infractions"],
  permission: "can_view",
  description: "Show the most recent 5 cases by the specified -mod",

  signature: [
    {
      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const modId = args.mod || msg.author.id;
    const mod = await resolveUser(pluginData.client, modId);
    const modName = mod instanceof User ? `${mod.username}#${mod.discriminator}` : modId;

    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    const totalCases = await casesPlugin.getTotalCasesByMod(modId);

    if (totalCases === 0) {
      sendErrorMessage(pluginData, msg.channel, `No cases by **${modName}**`);
      return;
    }

    const totalPages = Math.max(Math.ceil(totalCases / casesPerPage), 1);
    const prefix = getGuildPrefix(pluginData);

    createPaginatedMessage(
      pluginData.client,
      msg.channel,
      totalPages,
      async page => {
        const cases = await casesPlugin.getRecentCasesByMod(modId, casesPerPage, (page - 1) * casesPerPage);
        const lines = await asyncMap(cases, c => casesPlugin.getCaseSummary(c, true, msg.author.id));

        const firstCaseNum = (page - 1) * casesPerPage + 1;
        const lastCaseNum = page * casesPerPage;
        const title = `Most recent cases ${firstCaseNum}-${lastCaseNum} of ${totalCases} by ${modName}`;

        const embed: MessageEmbedOptions = {
          author: {
            name: title,
            iconURL: mod instanceof User ? mod.avatarURL() || mod.defaultAvatarURL : undefined,
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

        return { embeds: [embed] };
      },
      {
        limitToUserId: msg.author.id,
      },
    );
  },
});
