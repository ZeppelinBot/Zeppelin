import { z } from "zod";
import { convertDelayStringToMS, zDelayString } from "../../../utils.js";
import { automodTrigger } from "../helpers.js";

const configSchema = z.strictObject({
  only_new: z.boolean().default(false),
  new_threshold: zDelayString.default("1h"),
});

export const MemberJoinTrigger = automodTrigger<unknown>()({
  configSchema,

  async match({ context, triggerConfig }) {
    if (!context.joined || !context.member) {
      return;
    }

    if (triggerConfig.only_new) {
      const threshold = Date.now() - convertDelayStringToMS(triggerConfig.new_threshold)!;
      return context.member.user.createdTimestamp >= threshold ? {} : null;
    }

    return {};
  },

  renderMatchInformation() {
    return "";
  },
});
