import { GuildPluginData } from "knub";
import { CountersPluginType } from "../types";
import { parseCondition } from "../../../data/GuildCounters";

/**
 * Initialize a counter trigger.
 * After a counter trigger has been initialized, it will be checked against whenever the counter's values change.
 * If the trigger is triggered, an event is emitted.
 */
export async function initCounterTrigger(
  pluginData: GuildPluginData<CountersPluginType>,
  counterName: string,
  condition: string,
) {
  const counterId = pluginData.state.counterIds[counterName];
  if (!counterId) {
    throw new Error(`Unknown counter: ${counterName}`);
  }

  const parsedComparison = parseCondition(condition);
  if (!parsedComparison) {
    throw new Error(`Invalid comparison string: ${condition}`);
  }

  const [comparisonOp, comparisonValue] = parsedComparison;
  const counterTrigger = await pluginData.state.counters.initCounterTrigger(counterId, comparisonOp, comparisonValue);
  if (!pluginData.state.counterTriggersByCounterId.has(counterId)) {
    pluginData.state.counterTriggersByCounterId.set(counterId, new Map());
  }
  pluginData.state.counterTriggersByCounterId.get(counterId)!.set(counterTrigger.id, counterTrigger);
}
