import { GuildPluginData } from "knub";
import { CountersPluginType } from "../types";
import { buildConditionString } from "../../../data/GuildCounters";
import { CounterTrigger } from "../../../data/entities/CounterTrigger";
import { emitCounterEvent } from "./emitCounterEvent";

export async function checkAllValuesForTrigger(
  pluginData: GuildPluginData<CountersPluginType>,
  counterName: string,
  counterTrigger: CounterTrigger,
) {
  const triggeredContexts = await pluginData.state.counters.checkAllValuesForTrigger(counterTrigger);
  for (const context of triggeredContexts) {
    emitCounterEvent(
      pluginData,
      "trigger",
      counterName,
      buildConditionString(counterTrigger.comparison_op, counterTrigger.comparison_value),
      context.channelId,
      context.userId,
    );
  }
}
