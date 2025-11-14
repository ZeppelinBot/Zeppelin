import { GuildPluginData } from "vety";
import { resolveMember, resolveUser, UnknownUser } from "../../../utils.js";
import { CountersPlugin } from "../../Counters/CountersPlugin.js";
import { runAutomod } from "../functions/runAutomod.js";
import { AutomodContext, AutomodPluginType } from "../types.js";

export async function runAutomodOnCounterTrigger(
  pluginData: GuildPluginData<AutomodPluginType>,
  counterName: string,
  triggerName: string,
  channelId: string | null,
  userId: string | null,
  reverse: boolean,
) {
  const user = userId ? await resolveUser(pluginData.client, userId, "Automod:runAutomodOnCounterTrigger") : undefined;
  const member = (userId && (await resolveMember(pluginData.client, pluginData.guild, userId))) || undefined;
  const prettyCounterName = pluginData.getPlugin(CountersPlugin).getPrettyNameForCounter(counterName);
  const prettyTriggerName = pluginData
    .getPlugin(CountersPlugin)
    .getPrettyNameForCounterTrigger(counterName, triggerName);

  const context: AutomodContext = {
    timestamp: Date.now(),
    counterTrigger: {
      counter: counterName,
      trigger: triggerName,
      prettyCounter: prettyCounterName,
      prettyTrigger: prettyTriggerName,
      channelId,
      userId,
      reverse,
    },
    user: user instanceof UnknownUser ? undefined : user,
    member,
    // TODO: Channel
  };

  pluginData.state.queue.add(async () => {
    await runAutomod(pluginData, context);
  });
}
