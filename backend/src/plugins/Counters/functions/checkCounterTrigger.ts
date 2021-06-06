import { GuildPluginData } from "knub";
import { CounterTrigger } from "../../../data/entities/CounterTrigger";
import { CountersPluginType } from "../types";
import { emitCounterEvent } from "./emitCounterEvent";

export async function checkCounterTrigger(
  pluginData: GuildPluginData<CountersPluginType>,
  counterName: string,
  counterTrigger: CounterTrigger,
  channelId: string | null,
  userId: string | null,
) {
  const triggered = await pluginData.state.counters.checkForTrigger(counterTrigger, channelId, userId);
  if (triggered) {
    await emitCounterEvent(pluginData, "trigger", counterName, counterTrigger.name, channelId, userId);
  }
}
