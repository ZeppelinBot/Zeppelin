import { GuildPluginData } from "knub";
import { CountersPluginType } from "../types";
import { buildConditionString } from "../../../data/GuildCounters";
import { CounterTrigger } from "../../../data/entities/CounterTrigger";
import { emitCounterEvent } from "./emitCounterEvent";

export async function checkReverseCounterTrigger(
  pluginData: GuildPluginData<CountersPluginType>,
  counterName: string,
  counterTrigger: CounterTrigger,
  channelId: string | null,
  userId: string | null,
) {
  const triggered = await pluginData.state.counters.checkForReverseTrigger(counterTrigger, channelId, userId);
  if (triggered) {
    await emitCounterEvent(
      pluginData,
      "reverseTrigger",
      counterName,
      buildConditionString(counterTrigger.comparison_op, counterTrigger.comparison_value),
      channelId,
      userId,
    );
  }
}
