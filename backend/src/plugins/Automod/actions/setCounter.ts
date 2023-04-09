import * as t from "io-ts";
import { CountersPlugin } from "../../Counters/CountersPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { automodAction } from "../helpers";

export const SetCounterAction = automodAction({
  configType: t.type({
    counter: t.string,
    value: t.number,
  }),

  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig, matchResult, ruleName }) {
    const countersPlugin = pluginData.getPlugin(CountersPlugin);
    if (!countersPlugin.counterExists(actionConfig.counter)) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Unknown counter \`${actionConfig.counter}\` in \`add_to_counter\` action of Automod rule \`${ruleName}\``,
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
