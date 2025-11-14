import { z } from "zod";
import { zBoundedCharacters } from "../../../utils.js";
import { CountersPlugin } from "../../Counters/CountersPlugin.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { automodAction } from "../helpers.js";

const configSchema = z.object({
  counter: zBoundedCharacters(0, 100),
  amount: z.number(),
});

export const AddToCounterAction = automodAction({
  configSchema,

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const countersPlugin = pluginData.getPlugin(CountersPlugin);
    if (!countersPlugin.counterExists(actionConfig.counter)) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Unknown counter \`${actionConfig.counter}\` in \`add_to_counter\` action of Automod rule \`${ruleName}\``,
      });
      return;
    }

    countersPlugin.changeCounterValue(
      actionConfig.counter,
      contexts[0].message?.channel_id || null,
      contexts[0].user?.id || null,
      actionConfig.amount,
    );
  },
});
