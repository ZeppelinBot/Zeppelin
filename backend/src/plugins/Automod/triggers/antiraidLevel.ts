import { z } from "zod";
import { automodTrigger } from "../helpers.js";

interface AntiraidLevelTriggerResult {}

const configSchema = z.strictObject({
  level: z.nullable(z.string().max(100)),
  only_on_change: z.nullable(z.boolean()),
});

export const AntiraidLevelTrigger = automodTrigger<AntiraidLevelTriggerResult>()({
  configSchema,

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
