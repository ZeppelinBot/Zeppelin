import * as t from "io-ts";
import { automodAction } from "../helpers";
import { CountersPlugin } from "../../Counters/CountersPlugin";

export const ChangeCounterAction = automodAction({
  configType: t.type({
    name: t.string,
    change: t.string,
  }),

  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig, matchResult }) {
    const change = parseInt(actionConfig.change, 10);
    if (Number.isNaN(change)) {
      throw new Error("Invalid change number");
    }

    const countersPlugin = pluginData.getPlugin(CountersPlugin);
    countersPlugin.changeCounterValue(
      actionConfig.name,
      contexts[0].message?.channel_id || null,
      contexts[0].user?.id || null,
      change,
    );
  },
});
