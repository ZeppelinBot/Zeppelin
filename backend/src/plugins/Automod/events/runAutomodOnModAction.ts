import { GuildPluginData } from "vety";
import { resolveMember, resolveUser, UnknownUser } from "../../../utils.js";
import { ModActionType } from "../../ModActions/types.js";
import { runAutomod } from "../functions/runAutomod.js";
import { AutomodContext, AutomodPluginType } from "../types.js";

export async function runAutomodOnModAction(
  pluginData: GuildPluginData<AutomodPluginType>,
  modAction: ModActionType,
  userId: string,
  reason?: string,
  isAutomodAction = false,
) {
  const [user, member] = await Promise.all([
    resolveUser(pluginData.client, userId, "Automod:runAutomodOnModAction"),
    resolveMember(pluginData.client, pluginData.guild, userId),
  ]);

  const context: AutomodContext = {
    timestamp: Date.now(),
    user: user instanceof UnknownUser ? undefined : user,
    member: member ?? undefined,
    modAction: {
      type: modAction,
      reason,
      isAutomodAction,
    },
  };

  pluginData.state.queue.add(async () => {
    await runAutomod(pluginData, context);
  });
}
