import { GuildPluginData } from "knub";
import { resolveMember, resolveUser, UnknownUser } from "../../../utils";
import { ModActionType } from "../../ModActions/types";
import { runAutomod } from "../functions/runAutomod";
import { AutomodContext, AutomodPluginType } from "../types";

export async function runAutomodOnModAction(
  pluginData: GuildPluginData<AutomodPluginType>,
  modAction: ModActionType,
  userId: string,
  reason?: string,
  isAutomodAction: boolean = false,
) {
  const [user, member] = await Promise.all([
    resolveUser(pluginData.client, userId),
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
