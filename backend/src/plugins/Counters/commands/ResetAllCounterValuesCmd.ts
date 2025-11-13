import { guildPluginMessageCommand } from "vety";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { confirm, noop, trimMultilineString } from "../../../utils.js";
import { resetAllCounterValues } from "../functions/resetAllCounterValues.js";
import { CountersPluginType } from "../types.js";

export const ResetAllCounterValuesCmd = guildPluginMessageCommand<CountersPluginType>()({
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
      void pluginData.state.common.sendErrorMessage(message, `Unknown counter: ${args.counterName}`);
      return;
    }

    if (counter.can_reset_all === false) {
      void pluginData.state.common.sendErrorMessage(
        message,
        `Missing permissions to reset all of this counter's values`,
      );
      return;
    }

    const confirmed = await confirm(message, message.author.id, {
      content: trimMultilineString(`
        Do you want to reset **ALL** values for counter **${args.counterName}**?
        This will reset the counter for **all** users and channels.
        **Note:** This will *not* trigger any triggers or counter triggers.
      `),
    });
    if (!confirmed) {
      void pluginData.state.common.sendErrorMessage(message, "Cancelled");
      return;
    }

    const loadingMessage = await message.channel
      .send(`Resetting counter **${args.counterName}**. This might take a while. Please don't reload the config.`)
      .catch(() => null);

    await resetAllCounterValues(pluginData, args.counterName);

    loadingMessage?.delete().catch(noop);
    void pluginData.state.common.sendSuccessMessage(
      message,
      `All counter values for **${args.counterName}** have been reset`,
    );

    pluginData.getVetyInstance().reloadGuild(pluginData.guild.id);
  },
});
