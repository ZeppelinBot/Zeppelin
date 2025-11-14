import { GuildPluginData } from "vety";
import { CounterTrigger } from "../../../data/entities/CounterTrigger.js";
import { CountersPluginType } from "../types.js";
import { emitCounterEvent } from "./emitCounterEvent.js";

export async function checkAllValuesForTrigger(
  pluginData: GuildPluginData<CountersPluginType>,
  counterName: string,
  counterTrigger: CounterTrigger,
) {
  const triggeredContexts = await pluginData.state.counters.checkAllValuesForTrigger(counterTrigger);
  for (const context of triggeredContexts) {
    emitCounterEvent(pluginData, "trigger", counterName, counterTrigger.name, context.channelId, context.userId);
  }
}
