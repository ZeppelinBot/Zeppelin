import * as t from "io-ts";
import { automodTrigger } from "../helpers";
import { convertDelayStringToMS, tDelayString } from "../../../utils";

export const MemberJoinTrigger = automodTrigger<unknown>()({
  configType: t.type({
    only_new: t.boolean,
    new_threshold: tDelayString,
  }),

  defaultConfig: {
    only_new: false,
    new_threshold: "1h",
  },

  async match({ pluginData, context, triggerConfig }) {
    if (!context.joined || !context.member) {
      return;
    }

    if (triggerConfig.only_new) {
      const threshold = Date.now() - convertDelayStringToMS(triggerConfig.new_threshold);
      if (context.member.createdAt >= threshold) {
        return {};
      }
    }

    return {};
  },

  renderMatchInformation({ pluginData, contexts, triggerConfig }) {
    return null;
  },
});
