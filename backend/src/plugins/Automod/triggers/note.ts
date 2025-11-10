import { z } from "zod";
import { automodTrigger } from "../helpers.js";

// tslint:disable-next-line:no-empty-interface
interface NoteTriggerResultType {}

const configSchema = z.strictObject({});

export const NoteTrigger = automodTrigger<NoteTriggerResultType>()({
  configSchema,

  async match({ context }) {
    if (context.modAction?.type !== "note") {
      return;
    }

    return {
      extra: {},
    };
  },

  renderMatchInformation() {
    return `Note was added on user`;
  },
});
