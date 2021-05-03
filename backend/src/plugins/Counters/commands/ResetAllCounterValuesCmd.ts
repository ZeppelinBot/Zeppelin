import { guildCommand } from "knub";
import { CountersPluginType } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { resolveChannel, waitForReply } from "knub/dist/helpers";
import { TextChannel, User } from "eris";
import { confirm, MINUTES, noop, resolveUser, trimMultilineString, UnknownUser } from "../../../utils";
import { changeCounterValue } from "../functions/changeCounterValue";
import { setCounterValue } from "../functions/setCounterValue";
import { resetAllCounterValues } from "../functions/resetAllCounterValues";
import { counterIdLock } from "../../../utils/lockNameHelpers";

export const ResetAllCounterValuesCmd = guildCommand<CountersPluginType>()({
  trigger: ["counters reset_all"],
  permission: "can_reset_all",

  signature: {
    counterName: ct.string(),
  },

  async run({ pluginData, message, args }) {
    const config = pluginData.config.getForMessage(message);
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
    const confirmed = await confirm(
      pluginData.client,
      message.channel,
      message.author.id,
      trimMultilineString(`
        Do you want to reset **ALL** values for counter **${counterName}**?
        This will reset the counter for **all** users and channels.
        **Note:** This will *not* trigger any triggers or counter triggers.
      `),
    );
    if (!confirmed) {
      sendErrorMessage(pluginData, message.channel, "Cancelled");
      return;
    }

    const loadingMessage = await message.channel
      .createMessage(`Resetting counter **${counterName}**. This might take a while. Please don't reload the config.`)
      .catch(() => null);

    const lock = await pluginData.locks.acquire(counterIdLock(counterId), 10 * MINUTES);
    await resetAllCounterValues(pluginData, args.counterName);
    lock.interrupt();

    loadingMessage?.delete().catch(noop);
    sendSuccessMessage(pluginData, message.channel, `All counter values for **${counterName}** have been reset`);

    pluginData.getKnubInstance().reloadGuild(pluginData.guild.id);
  },
});
