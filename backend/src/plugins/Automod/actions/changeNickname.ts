import * as t from "io-ts";
import { LogType } from "../../../data/LogType";
import { nonNullish, unique } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { automodAction } from "../helpers";

export const ChangeNicknameAction = automodAction({
  configType: t.union([
    t.string,
    t.type({
      name: t.string,
    }),
  ]),

  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig }) {
    const members = unique(contexts.map(c => c.member).filter(nonNullish));

    for (const member of members) {
      if (pluginData.state.recentNicknameChanges.has(member.id)) continue;
      const newName = typeof actionConfig === "string" ? actionConfig : actionConfig.name;

      member.edit({ nick: newName }).catch(err => {
        pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, {
          body: `Failed to change the nickname of \`${member.id}\``,
        });
      });

      pluginData.state.recentNicknameChanges.set(member.id, { timestamp: Date.now() });
    }
  },
});
