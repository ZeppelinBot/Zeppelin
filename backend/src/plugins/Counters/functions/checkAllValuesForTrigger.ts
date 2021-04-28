import { GuildPluginData } from "knub";
import { CountersPluginType } from "../types";
import { CounterTrigger } from "../../../data/entities/CounterTrigger";
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
