import { automodTrigger } from "../helpers";
import z from "zod";

interface AntiraidLevelTriggerResult {}

const configSchema = z.strictObject({
  level: z.nullable(z.string().max(100)),
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

    return {
      extra: {},
    };
  },

  renderMatchInformation({ contexts }) {
    const newLevel = contexts[0].antiraid!.level;
    return newLevel ? `Antiraid level was set to ${newLevel}` : `Antiraid was turned off`;
  },
});
