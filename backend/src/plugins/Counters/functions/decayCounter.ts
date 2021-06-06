import { GuildPluginData } from "knub";
import { counterIdLock } from "../../../utils/lockNameHelpers";
import { CountersPluginType } from "../types";
import { checkAllValuesForReverseTrigger } from "./checkAllValuesForReverseTrigger";
import { checkAllValuesForTrigger } from "./checkAllValuesForTrigger";

export async function decayCounter(
  pluginData: GuildPluginData<CountersPluginType>,
  counterName: string,
  decayPeriodMS: number,
  decayAmount: number,
) {
  const config = pluginData.config.get();
  const counter = config.counters[counterName];
  if (!counter) {
    throw new Error(`Unknown counter: ${counterName}`);
  }

  const counterId = pluginData.state.counterIds[counterName];
  const lock = await pluginData.locks.acquire(counterIdLock(counterId));

  await pluginData.state.counters.decay(counterId, decayPeriodMS, decayAmount);

  // Check for trigger matches, if any, when the counter value changes
  const triggers = pluginData.state.counterTriggersByCounterId.get(counterId);
  if (triggers) {
    const triggersArr = Array.from(triggers.values());
    await Promise.all(triggersArr.map(trigger => checkAllValuesForTrigger(pluginData, counterName, trigger)));
    await Promise.all(triggersArr.map(trigger => checkAllValuesForReverseTrigger(pluginData, counterName, trigger)));
  }

  lock.unlock();
}
