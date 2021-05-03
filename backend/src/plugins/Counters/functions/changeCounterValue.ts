import { GuildPluginData } from "knub";
import { counterIdLock } from "../../../utils/lockNameHelpers";
import { CountersPluginType } from "../types";
import { checkCounterTrigger } from "./checkCounterTrigger";
import { checkReverseCounterTrigger } from "./checkReverseCounterTrigger";

export async function changeCounterValue(
  pluginData: GuildPluginData<CountersPluginType>,
  counterName: string,
  channelId: string | null,
  userId: string | null,
  change: number,
) {
  const config = pluginData.config.get();
  const counter = config.counters[counterName];
  if (!counter) {
    throw new Error(`Unknown counter: ${counterName}`);
  }

  if (counter.per_channel && !channelId) {
    throw new Error(`Counter is per channel but no channel ID was supplied`);
  }

  if (counter.per_user && !userId) {
    throw new Error(`Counter is per user but no user ID was supplied`);
  }

  channelId = counter.per_channel ? channelId : null;
  userId = counter.per_user ? userId : null;

  const counterId = pluginData.state.counterIds[counterName];
  const lock = await pluginData.locks.acquire(counterIdLock(counterId));

  await pluginData.state.counters.changeCounterValue(counterId, channelId, userId, change, counter.initial_value);

  // Check for trigger matches, if any, when the counter value changes
  const triggers = pluginData.state.counterTriggersByCounterId.get(counterId);
  if (triggers) {
    const triggersArr = Array.from(triggers.values());
    await Promise.all(
      triggersArr.map(trigger => checkCounterTrigger(pluginData, counterName, trigger, channelId, userId)),
    );
    await Promise.all(
      triggersArr.map(trigger => checkReverseCounterTrigger(pluginData, counterName, trigger, channelId, userId)),
    );
  }

  lock.unlock();
}
