import { GuildPluginData } from "vety";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { messageLock } from "../../../utils/lockNameHelpers.js";
import { CensorPluginType } from "../types.js";
import { applyFiltersToMsg } from "./applyFiltersToMsg.js";

export async function onMessageCreate(pluginData: GuildPluginData<CensorPluginType>, savedMessage: SavedMessage) {
  if (savedMessage.is_bot) return;
  const lock = await pluginData.locks.acquire(messageLock(savedMessage));

  const wasDeleted = await applyFiltersToMsg(pluginData, savedMessage);

  if (wasDeleted) {
    lock.interrupt();
  } else {
    lock.unlock();
  }
}
