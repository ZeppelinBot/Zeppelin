import { PluginData } from "knub";
import { AutoDeletePluginType } from "../types";
import { SavedMessage } from "src/data/entities/SavedMessage";
import { scheduleNextDeletion } from "./scheduleNextDeletion";

export function onMessageDelete(pluginData: PluginData<AutoDeletePluginType>, msg: SavedMessage) {
  const indexToDelete = pluginData.state.deletionQueue.findIndex(item => item.message.id === msg.id);
  if (indexToDelete > -1) {
    pluginData.state.deletionQueue.splice(indexToDelete, 1);
    scheduleNextDeletion(pluginData);
  }
}
