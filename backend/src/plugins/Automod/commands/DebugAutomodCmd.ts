import { guildPluginMessageCommand } from "vety";
import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { AutomodContext, AutomodPluginType } from "../types.js";
import { runAutomod } from "../functions/runAutomod.js";
import { createChunkedMessage } from "../../../utils.js";
import { getOrFetchGuildMember } from "../../../utils/getOrFetchGuildMember.js";
import { getOrFetchUser } from "../../../utils/getOrFetchUser.js";

export const DebugAutomodCmd = guildPluginMessageCommand<AutomodPluginType>()({
  trigger: "debug_automod",
  permission: "can_debug_automod",

  signature: {
    messageId: ct.string(),
  },

  async run({ pluginData, message, args }) {
    const targetMessage = await pluginData.state.savedMessages.find(args.messageId);
    if (!targetMessage || targetMessage.guild_id !== pluginData.guild.id) {
      pluginData.state.common.sendErrorMessage(message, "Message not found");
      return;
    }

    const member = await getOrFetchGuildMember(pluginData.guild, targetMessage.user_id);
    const user = await getOrFetchUser(pluginData.client, targetMessage.user_id);
    const context: AutomodContext = {
      timestamp: moment.utc(targetMessage.posted_at).valueOf(),
      message: targetMessage,
      user,
      member,
    };

    const result = await runAutomod(pluginData, context, true);

    let resultText = `**${result.triggered ? "✔️ Triggered" : "❌ Not triggered"}**\n\nRules checked:\n\n`;
    for (const ruleResult of result.rulesChecked) {
      resultText += `**${ruleResult.ruleName}**\n`;
      if (ruleResult.outcome.success) {
        resultText += `\\- Matched trigger: ${ruleResult.outcome.matchedTrigger.name} (trigger #${ruleResult.outcome.matchedTrigger.num})\n`;
      } else {
        resultText += `\\- No match (${ruleResult.outcome.reason})\n`;
      }
    }

    createChunkedMessage(message.channel, resultText.trim());
  },
});
