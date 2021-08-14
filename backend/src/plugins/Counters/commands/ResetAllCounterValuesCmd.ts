import { typedGuildCommand } from "knub";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { confirm, noop, trimMultilineString } from "../../../utils";
import { resetAllCounterValues } from "../functions/resetAllCounterValues";
import { CountersPluginType } from "../types";

export const ResetAllCounterValuesCmd = typedGuildCommand<CountersPluginType>()({
  trigger: ["counters reset_all"],
  permission: "can_reset_all",

  signature: {
    counterName: ct.string(),
  },

  async run({ pluginData, message, args }) {
    const config = await pluginData.config.getForMessage(message);
    const counter = config.counters[args.counterName];
    const counterId = pluginData.state.counterIds[args.counterName];
    if (!counter || !counterId) {
      sendErrorMessage(pluginData, message.channel, `Unknown counter: ${args.counterName}`);
      return;
    }

    if (counter.can_reset_all === false) {
      sendErrorMessage(pluginData, message.channel, `Missing permissions to reset all of this counter's values`);
      return;
    }

    const counterName = counter.name || args.counterName;
    const confirmed = await confirm(message.channel, message.author.id, {
      content: trimMultilineString(`
        Do you want to reset **ALL** values for counter **${counterName}**?
        This will reset the counter for **all** users and channels.
        **Note:** This will *not* trigger any triggers or counter triggers.
      `),
    });
    if (!confirmed) {
      sendErrorMessage(pluginData, message.channel, "Cancelled");
      return;
    }

    const loadingMessage = await message.channel
      .send(`Resetting counter **${counterName}**. This might take a while. Please don't reload the config.`)
      .catch(() => null);

    await resetAllCounterValues(pluginData, args.counterName);

    loadingMessage?.delete().catch(noop);
    sendSuccessMessage(pluginData, message.channel, `All counter values for **${counterName}** have been reset`);

    pluginData.getKnubInstance().reloadGuild(pluginData.guild.id);
  },
});
