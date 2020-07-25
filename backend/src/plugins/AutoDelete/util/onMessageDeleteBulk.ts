import { AutoDeletePluginType } from "../types";
import { PluginData } from "knub";
import { SavedMessage } from "src/data/entities/SavedMessage";
import { onMessageDelete } from "./onMessageDelete";

export function onMessageDeleteBulk(pluginData: PluginData<AutoDeletePluginType>, messages: SavedMessage[]) {
  for (const msg of messages) {
    onMessageDelete(pluginData, msg);
  }
}
