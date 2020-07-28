import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";
import { asyncMap, resolveMember, tNullable } from "../../../utils";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";

export const ChangeNicknameAction = automodAction({
  configType: t.type({
    name: t.string,
  }),

  async apply({ pluginData, contexts, actionConfig }) {
    const members = contexts.map(c => c.member).filter(Boolean);
    const uniqueMembers = new Set(members);

    for (const member of uniqueMembers) {
      if (pluginData.state.recentNicknameChanges.has(member.id)) continue;

      member.edit({ nick: actionConfig.name }).catch(err => {
        /* TODO: Log this error */
      });

      pluginData.state.recentNicknameChanges.set(member.id, { timestamp: Date.now() });
    }
  },
});
