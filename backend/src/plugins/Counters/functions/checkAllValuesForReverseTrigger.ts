import { GuildPluginData } from "knub";
import { CountersPluginType } from "../types";
import { CounterTrigger } from "../../../data/entities/CounterTrigger";
import { emitCounterEvent } from "./emitCounterEvent";

export async function checkAllValuesForReverseTrigger(
  pluginData: GuildPluginData<CountersPluginType>,
  counterName: string,
  counterTrigger: CounterTrigger,
) {
  const triggeredContexts = await pluginData.state.counters.checkAllValuesForReverseTrigger(counterTrigger);
  for (const context of triggeredContexts) {
    emitCounterEvent(pluginData, "reverseTrigger", counterName, counterTrigger.name, context.channelId, context.userId);
  }
}
