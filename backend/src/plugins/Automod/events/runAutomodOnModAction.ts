import { GuildPluginData } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { runAutomod } from "../functions/runAutomod";
import { resolveUser, UnknownUser } from "../../../utils";
import { ModActionType } from "../../ModActions/types";

export async function runAutomodOnModAction(
  pluginData: GuildPluginData<AutomodPluginType>,
  modAction: ModActionType,
  userId: string,
  reason?: string,
) {
  const user = await resolveUser(pluginData.client, userId);

  const context: AutomodContext = {
    timestamp: Date.now(),
    user: user instanceof UnknownUser ? undefined : user,
    modAction: {
      type: modAction,
      reason,
    },
  };

  pluginData.state.queue.add(async () => {
    await runAutomod(pluginData, context);
  });
}
