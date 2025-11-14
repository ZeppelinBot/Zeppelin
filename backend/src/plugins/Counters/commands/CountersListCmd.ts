import { guildPluginMessageCommand } from "vety";
import { trimMultilineString, ucfirst } from "../../../utils.js";
import { getGuildPrefix } from "../../../utils/getGuildPrefix.js";
import { CountersPluginType } from "../types.js";

export const CountersListCmd = guildPluginMessageCommand<CountersPluginType>()({
  trigger: ["counters list", "counter list", "counters"],
  permission: "can_view",

  signature: {},

  async run({ pluginData, message }) {
    const config = await pluginData.config.getForMessage(message);

    const countersToShow = Object.entries(config.counters).filter(([, c]) => c.can_view !== false);
    if (!countersToShow.length) {
      void pluginData.state.common.sendErrorMessage(message, "No counters are configured for this server");
      return;
    }

    const counterLines = countersToShow.map(([counterName, counter]) => {
      const title = counter.pretty_name ? `**${counter.pretty_name}** (\`${counterName}\`)` : `\`${counterName}\``;

      const types: string[] = [];
      if (counter.per_user) types.push("per user");
      if (counter.per_channel) types.push("per channel");
      const typeInfo = types.length ? types.join(", ") : "global";

      const decayInfo = counter.decay ? `decays ${counter.decay.amount} every ${counter.decay.every}` : null;

      const info = [typeInfo, decayInfo].filter(Boolean);
      return `${title}\n${ucfirst(info.join("; "))}`;
    });

    const hintLines = [`Use \`${getGuildPrefix(pluginData)}counters view <name>\` to view a counter's value`];
    if (config.can_edit) {
      hintLines.push(`Use \`${getGuildPrefix(pluginData)}counters set <name> <value>\` to change a counter's value`);
    }
    if (config.can_reset_all) {
      hintLines.push(`Use \`${getGuildPrefix(pluginData)}counters reset_all <name>\` to reset a counter entirely`);
    }

    message.channel.send(
      trimMultilineString(`
      ${counterLines.join("\n\n")}

      ${hintLines.join("\n")}
    `),
    );
  },
});
