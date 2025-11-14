import { z } from "zod";
import { automodTrigger } from "../helpers.js";

// tslint:disable-next-line:no-empty-interface
interface UnbanTriggerResultType {}

const configSchema = z.strictObject({});

export const UnbanTrigger = automodTrigger<UnbanTriggerResultType>()({
  configSchema,

  async match({ context }) {
    if (context.modAction?.type !== "unban") {
      return;
    }

    return {
      extra: {},
    };
  },

  renderMatchInformation() {
    return `User was unbanned`;
  },
});
