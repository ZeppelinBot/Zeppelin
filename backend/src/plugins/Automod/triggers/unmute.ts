import { z } from "zod";
import { automodTrigger } from "../helpers.js";

// tslint:disable-next-line:no-empty-interface
interface UnmuteTriggerResultType {}

const configSchema = z.strictObject({});

export const UnmuteTrigger = automodTrigger<UnmuteTriggerResultType>()({
  configSchema,

  async match({ context }) {
    if (context.modAction?.type !== "unmute") {
      return;
    }

    return {
      extra: {},
    };
  },

  renderMatchInformation() {
    return `User was unmuted`;
  },
});
