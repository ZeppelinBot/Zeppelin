import { GuildPluginData } from "knub";
import { CounterTrigger } from "../../../data/entities/CounterTrigger";
import { CountersPluginType } from "../types";
import { emitCounterEvent } from "./emitCounterEvent";

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
