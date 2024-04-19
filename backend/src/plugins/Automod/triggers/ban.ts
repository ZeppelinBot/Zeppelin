import z from "zod";
import { automodTrigger } from "../helpers";

// tslint:disable-next-line:no-empty-interface
interface BanTriggerResultType {}

const configSchema = z.strictObject({
  manual: z.boolean().default(true),
  automatic: z.boolean().default(true),
});

export const BanTrigger = automodTrigger<BanTriggerResultType>()({
  configSchema,

  async match({ context, triggerConfig }) {
    if (context.modAction?.type !== "ban") {
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
    return `User was banned`;
  },
});
