import * as t from "io-ts";
import { tNullable } from "../../../utils";
import { automodTrigger } from "../helpers";

interface AntiraidLevelTriggerResult {}

export const AntiraidLevelTrigger = automodTrigger<AntiraidLevelTriggerResult>()({
  configType: t.type({
    level: tNullable(t.string),
    only_on_change: tNullable(t.boolean),
  }),

  defaultConfig: {},

  async match({ triggerConfig, context }) {
    if (!context.antiraid) {
      return;
    }

    if (context.antiraid.level !== triggerConfig.level) {
      return;
    }

    if (
      triggerConfig.only_on_change &&
      context.antiraid.oldLevel !== undefined &&
      context.antiraid.level === context.antiraid.oldLevel
    ) {
      return;
    }

    return {
      extra: {},
    };
  },

  renderMatchInformation({ contexts }) {
    const newLevel = contexts[0].antiraid!.level;
    return newLevel ? `Antiraid level was set to ${newLevel}` : `Antiraid was turned off`;
  },
});
