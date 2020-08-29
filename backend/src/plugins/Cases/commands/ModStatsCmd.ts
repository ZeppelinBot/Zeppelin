import { casesCommand } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { getAllCaseTypeAmountsForUserId } from "../functions/getAllCaseTypeAmountsForUserId";
import { sendErrorMessage } from "src/pluginUtils";
import { EmbedOptions } from "eris";
import { CaseTypes } from "src/data/CaseTypes";
import moment from "moment-timezone";

export const ModStatsCmd = casesCommand({
  trigger: "modstats",
  permission: "can_modstats",
  description: "Show moderation statistics for a given user",

  signature: [
    {
      moderator: ct.resolvedUser(),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const firstCase = await pluginData.state.cases.findFirstByModId(args.moderator.id);
    if (!firstCase) {
      sendErrorMessage(pluginData, msg.channel, "The specified user never created any cases");
      return;
    }
    const latestCase = await pluginData.state.cases.findLatestByModId(args.moderator.id);

    const allAmounts = await getAllCaseTypeAmountsForUserId(pluginData, args.moderator.id);

    const embed: EmbedOptions = {
      fields: [],
    };

    embed.author = {
      name: `${args.moderator.username}#${args.moderator.discriminator}`,
      icon_url: args.moderator.avatarURL,
    };

    let embedDesc = `**The user created ${allAmounts.total} cases:**\n`;
    for (const type in CaseTypes) {
      if (!isNaN(Number(type))) {
        const typeAmount = allAmounts.typeAmounts.get(Number(type)).amount;
        if (typeAmount <= 0) continue;

        embedDesc += `\n**${CaseTypes[type]}:** ${typeAmount}`;
      }
    }
    embedDesc += `\n\n**First case on:** ${moment(firstCase.created_at).format("LL")}`;
    embedDesc += `\n**Latest case on:** ${moment(latestCase.created_at).format("LL")}`;
    embed.description = embedDesc;

    msg.channel.createMessage({ embed });
  },
});
