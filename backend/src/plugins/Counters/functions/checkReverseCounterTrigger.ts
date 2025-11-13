import { GuildPluginData } from "vety";
import { CounterTrigger } from "../../../data/entities/CounterTrigger.js";
import { CountersPluginType } from "../types.js";
import { emitCounterEvent } from "./emitCounterEvent.js";

export async function checkReverseCounterTrigger(
  pluginData: GuildPluginData<CountersPluginType>,
  counterName: string,
  counterTrigger: CounterTrigger,
  channelId: string | null,
  userId: string | null,
) {
  const triggered = await pluginData.state.counters.checkForReverseTrigger(counterTrigger, channelId, userId);
  if (triggered) {
    await emitCounterEvent(pluginData, "reverseTrigger", counterName, counterTrigger.name, channelId, userId);
  }
}
