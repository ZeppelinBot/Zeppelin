import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { messageLock } from "../../../utils/lockNameHelpers";
import { CensorPluginType } from "../types";
import { applyFiltersToMsg } from "./applyFiltersToMsg";

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
