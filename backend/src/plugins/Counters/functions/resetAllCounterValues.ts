import { GuildPluginData } from "knub";
import { counterIdLock } from "../../../utils/lockNameHelpers";
import { CountersPluginType } from "../types";

export async function resetAllCounterValues(pluginData: GuildPluginData<CountersPluginType>, counterName: string) {
  const config = pluginData.config.get();
  const counter = config.counters[counterName];
  if (!counter) {
    throw new Error(`Unknown counter: ${counterName}`);
  }

  const counterId = pluginData.state.counterIds[counterName];
  const lock = await pluginData.locks.acquire(counterIdLock(counterId));

  await pluginData.state.counters.resetAllCounterValues(counterId);

  lock.unlock();
}
