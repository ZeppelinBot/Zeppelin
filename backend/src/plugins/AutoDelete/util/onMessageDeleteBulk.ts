import { GuildPluginData } from "vety";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { AutoDeletePluginType } from "../types.js";
import { onMessageDelete } from "./onMessageDelete.js";

export function onMessageDeleteBulk(pluginData: GuildPluginData<AutoDeletePluginType>, messages: SavedMessage[]) {
  for (const msg of messages) {
    onMessageDelete(pluginData, msg);
  }
}
