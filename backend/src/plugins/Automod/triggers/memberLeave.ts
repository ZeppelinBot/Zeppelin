import z from "zod/v4";
import { automodTrigger } from "../helpers.js";

const configSchema = z.strictObject({});

export const MemberLeaveTrigger = automodTrigger<unknown>()({
  configSchema,

  async match({ context }) {
    if (!context.joined || !context.member) {
      return;
    }

    return {};
  },

  renderMatchInformation() {
    return "";
  },
});
