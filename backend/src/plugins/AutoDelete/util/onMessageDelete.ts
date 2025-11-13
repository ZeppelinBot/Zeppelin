import { GuildPluginData } from "vety";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { AutoDeletePluginType } from "../types.js";
import { scheduleNextDeletion } from "./scheduleNextDeletion.js";

export function onMessageDelete(pluginData: GuildPluginData<AutoDeletePluginType>, msg: SavedMessage) {
  const indexToDelete = pluginData.state.deletionQueue.findIndex((item) => item.message.id === msg.id);
  if (indexToDelete > -1) {
    pluginData.state.deletionQueue.splice(indexToDelete, 1);
    scheduleNextDeletion(pluginData);
  }
}
