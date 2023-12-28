import * as t from "io-ts";
import { automodTrigger } from "../helpers";

export const MemberLeaveTrigger = automodTrigger<unknown>()({
  configType: t.type({}),

  defaultConfig: {},

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
