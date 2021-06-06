import * as t from "io-ts";
import { LogType } from "../../../data/LogType";
import { CountersPlugin } from "../../Counters/CountersPlugin";
import { automodAction } from "../helpers";

export const AddToCounterAction = automodAction({
  configType: t.type({
    counter: t.string,
    amount: t.number,
  }),

  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig, matchResult, ruleName }) {
    const countersPlugin = pluginData.getPlugin(CountersPlugin);
    if (!countersPlugin.counterExists(actionConfig.counter)) {
      pluginData.state.logs.log(LogType.BOT_ALERT, {
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
