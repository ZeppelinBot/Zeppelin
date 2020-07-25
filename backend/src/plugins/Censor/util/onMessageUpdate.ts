import { PluginData } from "knub";
import { CensorPluginType } from "../types";
import { SavedMessage } from "src/data/entities/SavedMessage";
import { applyFiltersToMsg } from "./applyFiltersToMsg";

export async function onMessageUpdate(pluginData: PluginData<CensorPluginType>, savedMessage: SavedMessage) {
  if (savedMessage.is_bot) return;
  const lock = await pluginData.locks.acquire(`message-${savedMessage.id}`);

  const wasDeleted = await applyFiltersToMsg(pluginData, savedMessage);

  if (wasDeleted) {
    lock.interrupt();
  } else {
    lock.unlock();
  }
}
