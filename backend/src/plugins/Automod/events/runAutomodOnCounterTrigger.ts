import { GuildPluginData } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { runAutomod } from "../functions/runAutomod";
import { resolveMember, resolveUser, UnknownUser } from "../../../utils";

export async function runAutomodOnCounterTrigger(
  pluginData: GuildPluginData<AutomodPluginType>,
  counterName: string,
  condition: string,
  channelId: string | null,
  userId: string | null,
  reverse: boolean,
) {
  const user = userId ? await resolveUser(pluginData.client, userId) : undefined;

  const member = (userId && (await resolveMember(pluginData.client, pluginData.guild, userId))) || undefined;

  const context: AutomodContext = {
    timestamp: Date.now(),
    counterTrigger: {
      name: counterName,
      condition,
      channelId,
      userId,
      reverse,
    },
    user: user instanceof UnknownUser ? undefined : user,
    member,
  };

  pluginData.state.queue.add(async () => {
    await runAutomod(pluginData, context);
  });
}
