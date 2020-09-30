import { AutoDeletePluginType } from "../types";
import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { onMessageDelete } from "./onMessageDelete";

export function onMessageDeleteBulk(pluginData: GuildPluginData<AutoDeletePluginType>, messages: SavedMessage[]) {
  for (const msg of messages) {
    onMessageDelete(pluginData, msg);
  }
}
