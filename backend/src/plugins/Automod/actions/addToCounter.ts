import * as t from "io-ts";
import { automodAction } from "../helpers";
import { CountersPlugin } from "../../Counters/CountersPlugin";

export const AddToCounterAction = automodAction({
  configType: t.type({
    counter: t.string,
    amount: t.number,
  }),

  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig, matchResult }) {
    const countersPlugin = pluginData.getPlugin(CountersPlugin);
    countersPlugin.changeCounterValue(
      actionConfig.counter,
      contexts[0].message?.channel_id || null,
      contexts[0].user?.id || null,
      actionConfig.amount,
    );
  },
});
