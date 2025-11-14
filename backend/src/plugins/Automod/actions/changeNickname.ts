import { z } from "zod";
import { nonNullish, unique, zBoundedCharacters } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { automodAction } from "../helpers.js";

export const ChangeNicknameAction = automodAction({
  configSchema: z.union([
    zBoundedCharacters(0, 32),
    z.strictObject({
      name: zBoundedCharacters(0, 32),
    }),
  ]),

  async apply({ pluginData, contexts, actionConfig }) {
    const members = unique(contexts.map((c) => c.member).filter(nonNullish));

    for (const member of members) {
      if (pluginData.state.recentNicknameChanges.has(member.id)) continue;
      const newName = typeof actionConfig === "string" ? actionConfig : actionConfig.name;

      member.edit({ nick: newName }).catch(() => {
        pluginData.getPlugin(LogsPlugin).logBotAlert({
          body: `Failed to change the nickname of \`${member.id}\``,
        });
      });

      pluginData.state.recentNicknameChanges.set(member.id, { timestamp: Date.now() });
    }
  },
});
