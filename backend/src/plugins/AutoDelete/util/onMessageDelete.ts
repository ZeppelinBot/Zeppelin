import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { AutoDeletePluginType } from "../types";
import { scheduleNextDeletion } from "./scheduleNextDeletion";

export function onMessageDelete(pluginData: GuildPluginData<AutoDeletePluginType>, msg: SavedMessage) {
  const indexToDelete = pluginData.state.deletionQueue.findIndex(item => item.message.id === msg.id);
  if (indexToDelete > -1) {
    pluginData.state.deletionQueue.splice(indexToDelete, 1);
    scheduleNextDeletion(pluginData);
  }
}
