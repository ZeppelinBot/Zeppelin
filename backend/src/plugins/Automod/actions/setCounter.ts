import { z } from "zod";
import { MAX_COUNTER_VALUE, MIN_COUNTER_VALUE } from "../../../data/GuildCounters.js";
import { zBoundedCharacters } from "../../../utils.js";
import { CountersPlugin } from "../../Counters/CountersPlugin.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { automodAction } from "../helpers.js";

export const SetCounterAction = automodAction({
  configSchema: z.strictObject({
    counter: zBoundedCharacters(0, 100),
    value: z.number().min(MIN_COUNTER_VALUE).max(MAX_COUNTER_VALUE),
  }),

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const countersPlugin = pluginData.getPlugin(CountersPlugin);
    if (!countersPlugin.counterExists(actionConfig.counter)) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Unknown counter \`${actionConfig.counter}\` in \`set_counter\` action of Automod rule \`${ruleName}\``,
      });
      return;
    }

    countersPlugin.setCounterValue(
      actionConfig.counter,
      contexts[0].message?.channel_id || null,
      contexts[0].user?.id || null,
      actionConfig.value,
    );
  },
});
