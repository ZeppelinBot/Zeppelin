import * as t from "io-ts";
import { automodTrigger } from "../helpers";
import { tNullable } from "../../../utils";

// tslint:disable-next-line
interface AntiraidLevelTriggerResult {}

export const AntiraidLevelTrigger = automodTrigger<AntiraidLevelTriggerResult>()({
  configType: t.type({
    level: tNullable(t.string),
  }),

  defaultConfig: {},

  async match({ triggerConfig, context, pluginData }) {
    if (!context.antiraid) {
      return;
    }

    if (context.antiraid.level !== triggerConfig.level) {
      return;
    }

    return {
      extra: {},
    };
  },

  renderMatchInformation({ matchResult, pluginData, contexts, triggerConfig }) {
    const newLevel = contexts[0].antiraid!.level;
    return newLevel ? `Antiraid level was set to ${newLevel}` : `Antiraid was turned off`;
  },
});
