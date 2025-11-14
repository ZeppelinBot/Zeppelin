import { z } from "zod";
import { automodTrigger } from "../helpers.js";

// tslint:disable-next-line:no-empty-interface
interface MuteTriggerResultType {}

const configSchema = z.strictObject({
  manual: z.boolean().default(true),
  automatic: z.boolean().default(true),
});

export const MuteTrigger = automodTrigger<MuteTriggerResultType>()({
  configSchema,

  async match({ context, triggerConfig }) {
    if (context.modAction?.type !== "mute") {
      return;
    }
    // If automatic && automatic turned off -> return
    if (context.modAction.isAutomodAction && !triggerConfig.automatic) return;
    // If manual && manual turned off -> return
    if (!context.modAction.isAutomodAction && !triggerConfig.manual) return;

    return {
      extra: {},
    };
  },

  renderMatchInformation() {
    return `User was muted`;
  },
});
