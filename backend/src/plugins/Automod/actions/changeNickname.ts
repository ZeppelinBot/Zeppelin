import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { unique } from "../../../utils";

export const ChangeNicknameAction = automodAction({
  configType: t.type({
    name: t.string,
  }),

  async apply({ pluginData, contexts, actionConfig }) {
    const members = unique(contexts.map(c => c.member).filter(Boolean));

    for (const member of members) {
      if (pluginData.state.recentNicknameChanges.has(member.id)) continue;

      member.edit({ nick: actionConfig.name }).catch(err => {
        pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, {
          body: `Failed to change the nickname of \`${member.id}\``,
        });
      });

      pluginData.state.recentNicknameChanges.set(member.id, { timestamp: Date.now() });
    }
  },
});
